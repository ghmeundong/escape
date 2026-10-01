let masterVolumeMultiplier = 1;

export function createBufferedSound(params: {
  context: AudioContext;
  buffer: AudioBuffer;
  volume: number;
  playbackRate?: number;
}): { source: AudioBufferSourceNode; gain: GainNode } {
  const { context, buffer, volume, playbackRate = 1 } = params;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  return { source, gain };
}

export function loadSoundBuffer(
  context: AudioContext,
  url: string,
): Promise<AudioBuffer> {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((audioData) => context.decodeAudioData(audioData));
}

export function getMasterVolumeMultiplier(): number {
  return masterVolumeMultiplier;
}

export function setMasterVolumePercent(percent: number): void {
  masterVolumeMultiplier = Math.max(0, Math.min(100, percent)) / 100;
}

function createAudioEnvelope(buffer: AudioBuffer): number[] {
  const samples = buffer.getChannelData(0);
  const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.01));
  const envelope: number[] = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let energy = 0;
    const end = Math.min(samples.length, offset + windowSize);
    for (let index = offset; index < end; index += 1)
      energy += samples[index] ** 2;
    envelope.push(Math.sqrt(energy / Math.max(1, end - offset)));
  }
  return envelope;
}

export function detectCarBreakPeaks(buffer: AudioBuffer): number[] {
  const envelope = createAudioEnvelope(buffer);
  const candidates = envelope
    .map((value, index) => ({ value, time: index * 0.01 }))
    .filter(
      (candidate, index) =>
        candidate.value >= (envelope[index - 1] ?? 0) &&
        candidate.value >= (envelope[index + 1] ?? 0),
    )
    .sort((first, second) => second.value - first.value);
  const peaks: number[] = [];
  for (const candidate of candidates) {
    if (peaks.every((peak) => Math.abs(peak - candidate.time) >= 0.25))
      peaks.push(candidate.time);
    if (peaks.length === 2) break;
  }
  return peaks.sort((first, second) => first - second);
}

export function detectHeartbeatPeaks(buffer: AudioBuffer): number[] {
  const envelope = createAudioEnvelope(buffer);
  const peakThreshold = Math.max(...envelope, 0) * 0.25;
  const peaks: number[] = [];
  for (let index = 1; index < envelope.length - 1; index += 1) {
    if (
      envelope[index] < peakThreshold ||
      envelope[index] < envelope[index - 1] ||
      envelope[index] < envelope[index + 1]
    )
      continue;
    const time = index * 0.01;
    if (peaks.every((peak) => time - peak >= 0.18)) peaks.push(time);
  }
  return peaks.slice(0, 2);
}

export interface RunningFootstepAnalysis {
  interval: number;
  samples: AudioBuffer[];
}

export function analyzeRunningFootsteps(
  buffer: AudioBuffer,
  context: AudioContext,
  initialInterval: number,
): RunningFootstepAnalysis {
  const envelope = createAudioEnvelope(buffer);
  const sortedEnvelope = [...envelope].sort((first, second) => first - second);
  const noiseFloor =
    sortedEnvelope[Math.floor(sortedEnvelope.length * 0.65)] ?? 0;
  const peakThreshold = Math.max(
    noiseFloor * 2.2,
    (sortedEnvelope.at(-1) ?? 0) * 0.2,
  );
  const minPeakSpacing = Math.max(1, Math.floor(0.16 / 0.01));
  const peaks: number[] = [];
  for (let index = 1; index < envelope.length - 1; index += 1) {
    if (
      envelope[index] < peakThreshold ||
      envelope[index] < envelope[index - 1] ||
      envelope[index] < envelope[index + 1]
    )
      continue;
    if (peaks.length > 0 && index - peaks[peaks.length - 1] < minPeakSpacing) {
      if (envelope[index] > envelope[peaks[peaks.length - 1]])
        peaks[peaks.length - 1] = index;
      continue;
    }
    peaks.push(index);
  }

  const tenthFootstep = peaks[9];
  const eleventhFootstep = peaks[10];
  const detectedDuration =
    eleventhFootstep !== undefined
      ? Math.max(0.2, eleventhFootstep * 0.01 - 0.035)
      : tenthFootstep !== undefined
        ? Math.min(buffer.duration, tenthFootstep * 0.01 + 0.12)
        : buffer.duration;
  const firstFootstep = peaks[0];
  const secondFootstep = peaks[1];
  let interval = initialInterval;
  let clipDuration: number;
  let cyclesPerLoop: number;
  if (firstFootstep !== undefined && secondFootstep !== undefined) {
    interval = Math.max(0.2, (secondFootstep - firstFootstep) * 0.01);
    const loopStart = Math.max(0, firstFootstep * 0.01 - 0.08);
    clipDuration =
      eleventhFootstep === undefined
        ? Math.min(buffer.duration, detectedDuration)
        : Math.min(
            buffer.duration,
            Math.max(loopStart + interval, eleventhFootstep * 0.01 - 0.035),
          );
    cyclesPerLoop =
      eleventhFootstep === undefined ? Math.max(1, peaks.length - 1) : 10;
    const loopDuration = Math.max(0.01, clipDuration - loopStart);
    interval = loopDuration / cyclesPerLoop;
  } else {
    clipDuration = Math.min(buffer.duration, detectedDuration);
    cyclesPerLoop = Math.max(1, Math.round(clipDuration / interval));
    interval = clipDuration / cyclesPerLoop;
  }

  const peakTimes = peaks.slice(0, cyclesPerLoop).map((peak) => peak * 0.01);
  const samples = peakTimes.map((peakTime, index) => {
    const nextPeak = peakTimes[index + 1];
    const sampleEnd = Math.min(
      clipDuration,
      peakTime + Math.min(0.28, interval * 0.65),
      nextPeak === undefined
        ? clipDuration
        : (peakTime + nextPeak) * 0.5 + 0.05,
    );
    const startFrame = Math.floor(peakTime * buffer.sampleRate);
    const endFrame = Math.max(
      startFrame + 1,
      Math.min(buffer.length, Math.ceil(sampleEnd * buffer.sampleRate)),
    );
    const sample = context.createBuffer(
      buffer.numberOfChannels,
      endFrame - startFrame,
      buffer.sampleRate,
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      sample.copyToChannel(
        buffer.getChannelData(channel).subarray(startFrame, endFrame),
        channel,
      );
    }
    return sample;
  });
  return { interval, samples };
}

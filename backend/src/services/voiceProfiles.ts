export interface VoiceProfile {
  id: string;
  label: string;
  description: string;
  supports: string[];
  mockOnly?: boolean;
  elevenLabsVoiceId?: string;
}

const profiles: VoiceProfile[] = [
  {
    id: "referee_calm",
    label: "Referee (calm)",
    description: "rules-first, low drama",
    supports: ["en", "fr", "es"],
  },
  {
    id: "hype_caster",
    label: "Hype Caster",
    description: "fast-paced, energetic play-by-play",
    supports: ["en", "es"],
  },
  {
    id: "coach_mentor",
    label: "Coach (mentor)",
    description: "measured guidance with constructive tone",
    supports: ["en", "fr"],
  },
  {
    id: "analyst_precise",
    label: "Analyst (precise)",
    description: "technical, detail-heavy commentary",
    supports: ["en"],
  },
];

export function getVoiceProfiles(): VoiceProfile[] {
  return profiles;
}

export function getVoiceProfileById(id: string | undefined): VoiceProfile | undefined {
  if (!id) return undefined;
  return profiles.find((profile) => profile.id === id);
}

export function isValidVoiceProfile(id: string | undefined): boolean {
  if (!id) return false;
  return Boolean(getVoiceProfileById(id));
}

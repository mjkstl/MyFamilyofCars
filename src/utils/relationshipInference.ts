import type { Member, ParentLinkConfidence } from '@/types/database';

/**
 * Generation delta relative to the person entering the new member.
 * Negative = older generation (that member would be the NEW member's
 * parent-slot), positive = younger generation, 0 = same generation.
 */
const RELATIONSHIP_GENERATION_DELTA: Record<string, number> = {
  dad: -1,
  father: -1,
  mom: -1,
  mother: -1,
  parent: -1,
  grandpa: -2,
  grandfather: -2,
  grandma: -2,
  grandmother: -2,
  son: 1,
  daughter: 1,
  child: 1,
  grandson: 2,
  granddaughter: 2,
  sibling: 0,
  brother: 0,
  sister: 0,
  spouse: 0,
  husband: 0,
  wife: 0,
  me: 0,
  self: 0,
};

export interface InferenceCandidate {
  member: Member;
  /** true if the display name matches the candidate closely */
  nameMatched: boolean;
}

export interface InferenceResult {
  /** The member we suggest linking as parent_member_id, if any */
  suggestedParent: Member | null;
  confidence: ParentLinkConfidence;
  /** Human-readable reason, useful for the confirm-prompt copy */
  reason: string;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Very light fuzzy match: exact, or one is a case-insensitive substring of
 * the other. Good enough for first-name matching within a small family;
 * intentionally conservative rather than clever, since a wrong high-
 * confidence guess is worse than falling back to manual.
 */
function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Infers a parent_member_id suggestion for a new member being added.
 *
 * @param relationshipLabel - free-text relationship the user typed/picked
 *   (e.g. "Dad"), relative to `enteredByMemberId`.
 * @param referenceName - optional name typed alongside the relationship
 *   (e.g. user typed "Dad" then "Malcolm") used for name-based disambiguation.
 * @param existingMembers - all members already in the family.
 * @param enteredByMemberId - the member (already in the family) who is
 *   adding this new person; the relationship label is relative to them.
 */
export function inferParentLink(
  relationshipLabel: string,
  referenceName: string | undefined,
  existingMembers: Member[],
  enteredByMemberId: string | null
): InferenceResult {
  const label = normalize(relationshipLabel);
  const delta = RELATIONSHIP_GENERATION_DELTA[label];

  if (delta === undefined) {
    return {
      suggestedParent: null,
      confidence: 'low',
      reason: `"${relationshipLabel}" isn't a recognized relationship term — pick manually.`,
    };
  }

  // Only "older generation" relationships (negative delta) produce a
  // parent_member_id suggestion for the NEW member. Same/younger-generation
  // relationships don't set the new member's parent directly here (e.g. a
  // sibling shares the enterer's parent — handled by caller if desired).
  if (delta >= 0) {
    return {
      suggestedParent: null,
      confidence: 'manual',
      reason: `"${relationshipLabel}" doesn't map to an older-generation link automatically.`,
    };
  }

  const enteredBy = existingMembers.find((m) => m.id === enteredByMemberId) ?? null;

  // Candidate pool: everyone in the family who isn't the new member itself.
  const candidates: InferenceCandidate[] = existingMembers.map((member) => ({
    member,
    nameMatched: referenceName ? namesLikelyMatch(member.display_name, referenceName) : false,
  }));

  const nameMatches = candidates.filter((c) => c.nameMatched);

  if (nameMatches.length === 1) {
    return {
      suggestedParent: nameMatches[0].member,
      confidence: 'high',
      reason: `Matched the name "${referenceName}" to an existing family member.`,
    };
  }

  if (nameMatches.length > 1) {
    return {
      suggestedParent: null,
      confidence: 'low',
      reason: `Multiple existing members match "${referenceName}" — pick the right one.`,
    };
  }

  // No name given / no match: if there's exactly one existing member one
  // generation up from the enterer with a matching relationship label
  // pattern, we *could* guess — but without a name signal this is
  // ambiguous in most real families, so default to manual per the
  // mistake-proofing design (never silently commit a low-signal guess).
  void enteredBy;
  return {
    suggestedParent: null,
    confidence: 'low',
    reason: 'No name match found — pick the right family member manually.',
  };
}

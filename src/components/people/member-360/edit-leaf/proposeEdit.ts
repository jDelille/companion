// "Ask AI to edit": turns a staff request like
// "Move <member> to <program> and assign <instructor>" into a proposed edit.
// For now this is keyword matching, not a language model: it looks for a program
// name and an "assign <Name>" instructor in the request. Nothing is saved here.

export type ProgramOption = { id: string; name: string };

export type EditProposal = {
  program: { from: string; to: ProgramOption } | null;
  instructor: { from: string; to: string } | null; // shown, but Odoo can't save it yet
};

// Words every program shares say nothing about which one is meant ("Children", "Class")
function distinctiveWords(name: string, allNames: string[]): string[] {
  const words = name.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  return words.filter((word) => !allNames.every((other) => other.toLowerCase().includes(word)));
}

// "(Ages 5-7)" and similar can be in a course name
function escapeForRegex(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The one program the request names, other than the current one. Full names win;
// otherwise a distinctive word ("Advanced"). Two possible matches = no guess.
function findProgram(request: string, programs: ProgramOption[], currentProgram: string): ProgramOption | null {
  const text = request.toLowerCase();
  const others = programs.filter((program) => program.name !== currentProgram);

  const fullMatches = others.filter((program) => text.includes(program.name.toLowerCase()));
  if (fullMatches.length === 1) return fullMatches[0];

  const names = programs.map((program) => program.name);
  const wordMatches = others.filter((program) =>
    distinctiveWords(program.name, names).some((word) => new RegExp(`\\b${escapeForRegex(word)}\\b`).test(text)),
  );
  if (wordMatches.length === 1) return wordMatches[0];
  return null;
}

// "assign <Name>", "assign to <Name>": up to three capitalised words after "assign"
function findInstructor(request: string): string | null {
  const match = request.match(/assign(?:\s+to)?\s+((?:[A-Z][a-z]+\s?){1,3})/);
  return match ? match[1].trim() : null;
}

export function proposeEdit(
  request: string,
  programs: ProgramOption[],
  currentProgram: string,
  currentInstructor: string,
): EditProposal | null {
  const program = findProgram(request, programs, currentProgram);
  const instructor = findInstructor(request);
  if (!program && !instructor) return null;
  return {
    program: program ? { from: currentProgram, to: program } : null,
    instructor: instructor && instructor !== currentInstructor ? { from: currentInstructor, to: instructor } : null,
  };
}

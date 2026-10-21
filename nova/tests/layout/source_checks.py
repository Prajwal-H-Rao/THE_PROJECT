"""Check the sources that the layout diff cites. Verify the spec lines, the plan lines and the task rows."""

import diff_doc

SPEC_CITE = diff_doc.SPEC_CITE
PLAN_CITE = diff_doc.PLAN_CITE
MODULE_TASK = diff_doc.MODULE_TASK
BACKTICK = diff_doc.BACKTICK

# The number of shared words that a cited plan line must hold.
MIN_SHARED_WORDS = 2


def check_spec_citations(index, text):
    """Check that every spec citation names a line that the spec holds."""
    problems = []
    for value in sorted(set(SPEC_CITE.findall(text))):
        if not index.line_text(int(value)).strip():
            problems.append("the document cites spec:" + value + " and the spec has no such line")
    if problems:
        return "; ".join(problems)
    return None


def check_plan_citations(repo_root, text, rows):
    """Check that every plan citation names a line that holds the words of its sentence."""
    problems = []
    for sentence in all_sentences(text, rows):
        for path, number in PLAN_CITE.findall(sentence):
            problems += plan_citation_problems(repo_root, sentence, path, int(number))
    if problems:
        return "; ".join(problems)
    return None


def all_sentences(text, rows):
    """Return the sentences of a document and of every row note."""
    sentences = list(diff_doc.sentences(text))
    for row in rows:
        sentences += diff_doc.sentences(row.get("Note", ""))
    return sentences


def plan_citation_problems(repo_root, sentence, path, number):
    """Return the problems of one plan citation."""
    target = repo_root / path
    if not target.is_file():
        return ["the document cites " + path + " and the plan has no such file"]
    lines = target.read_text(encoding="utf-8").splitlines()
    if number < 1 or number > len(lines):
        return ["the document cites " + path + ":" + str(number) + " and the file has no such line"]
    cited = lines[number - 1]
    wanted = citation_words(sentence)
    shared = wanted & diff_doc.words(cited)
    if len(shared) < MIN_SHARED_WORDS:
        return ["the document cites " + path + ":" + str(number) + " and the line holds no word of it"]
    if len(shared) * 2 < len(wanted):
        return ["the document cites " + path + ":" + str(number) +
                " and the line holds %d of the %d words of the sentence" % (len(shared), len(wanted))]
    return token_problems(sentence, path, number, cited)


def citation_words(sentence):
    """Return the words of a sentence that a cited plan line must hold."""
    # The citation names the file, so its words say nothing about the line.
    return diff_doc.words(PLAN_CITE.sub(" ", sentence))


def token_problems(sentence, path, number, cited):
    """Return the problems of a named term that the cited plan line lacks."""
    if len(PLAN_CITE.findall(sentence)) != 1:
        return []
    problems = []
    for token in BACKTICK.findall(sentence):
        if token not in cited:
            problems.append("the document cites " + path + ":" + str(number) +
                            " and the line holds no " + token)
    return problems


def check_task_bindings(text, rows, texts, plan):
    """Check that every named path belongs to the build sequence task that names it."""
    problems = []
    for sentence in diff_doc.sentences(text):
        problems += sentence_problems(sentence, texts, plan, False)
    for row in rows:
        for sentence in diff_doc.sentences(row.get("Note", "")):
            problems += sentence_problems(sentence, texts, plan, True)
    if problems:
        return "; ".join(problems)
    return None


def sentence_problems(sentence, texts, plan, allow_absence):
    """Return the problems of one sentence that names a path."""
    names = BACKTICK.findall(sentence)
    if not names:
        return []
    references = list(MODULE_TASK.finditer(sentence))
    if references:
        return binding_problems(sentence, names, references, texts)
    if allow_absence:
        return absence_problems(sentence, names, plan)
    return []


def binding_problems(sentence, names, references, texts):
    """Return the problems of one named path in a sentence that names a task."""
    problems = []
    for match in references:
        module = match.group(1)
        first = int(match.group(2))
        last = int(match.group(3)) if match.group(3) else first
        for task in range(first, last + 1):
            text = texts.get(module, {}).get(task, "")
            for name in names:
                if normalise(name) not in text:
                    problems.append("%s names %s but module %s task %d does not" % (
                        sentence, name, module, task))
    return problems


def absence_problems(sentence, names, plan):
    """Return the problems of a sentence that names a path no plan task owns."""
    problems = []
    for name in names:
        needle = name if "/" in name else name + "/"
        if needle in plan:
            problems.append("%s says no plan path matches %s" % (sentence, name))
    return problems


def normalise(name):
    """Return a named path as a path under nova/."""
    text = name.strip().rstrip("/")
    if text.startswith("nova/"):
        return text[len("nova/"):]
    return text

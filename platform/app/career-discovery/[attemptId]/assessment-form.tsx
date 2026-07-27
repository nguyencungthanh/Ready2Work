"use client";

import { useState, useTransition } from "react";
import { saveAnswersAction, submitAssessmentAction } from "../actions";

interface Question {
  id: string;
  position: number;
  prompt: string;
}

const SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

const PER_PAGE = 5;

export function AssessmentForm({
  attemptId,
  questions,
  initialAnswers,
}: {
  attemptId: string;
  questions: Question[];
  initialAnswers: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.ceil(questions.length / PER_PAGE);
  const pageQuestions = questions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const isLastPage = page === totalPages - 1;
  const pageComplete = pageQuestions.every((q) => answers[q.id] !== undefined);

  function select(questionId: string, value: number) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setError(null);
  }

  function goNext() {
    if (!pageComplete) {
      setError("Please answer every question on this page.");
      return;
    }
    // Save progress so the attempt can be resumed later.
    startTransition(async () => {
      await saveAnswersAction(attemptId, answers);
      setPage((p) => p + 1);
    });
  }

  function goPrevious() {
    setError(null);
    setPage((p) => Math.max(0, p - 1));
  }

  function submit() {
    if (answeredCount < questions.length) {
      setError("Please answer every question before submitting.");
      return;
    }
    startTransition(async () => {
      await submitAssessmentAction(attemptId, answers);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">Career Assessment</h1>
        <p className="text-sm text-muted">
          Page {page + 1} of {totalPages}
        </p>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-label="Questions answered"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        {answeredCount} of {questions.length} answered
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ol className="mt-8 space-y-8">
        {pageQuestions.map((question) => (
          <li key={question.id}>
            <fieldset>
              <legend className="text-sm font-medium text-foreground">
                {question.position}. {question.prompt}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCALE.map((option) => {
                  const selected = answers[question.id] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors duration-200 ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted hover:bg-surface"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={selected}
                        onChange={() => select(question.id, option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={goPrevious}
          disabled={page === 0 || pending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50 transition-colors duration-200"
        >
          Previous
        </button>

        {isLastPage ? (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 transition-all duration-300"
          >
            {pending ? "Scoring…" : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 transition-all duration-300"
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}

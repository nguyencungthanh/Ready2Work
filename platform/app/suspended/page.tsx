export const metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Your account is suspended</h1>
      <p className="mt-3 text-sm text-muted">
        You cannot access the platform right now. If you think this is a mistake, contact support.
      </p>
    </main>
  );
}

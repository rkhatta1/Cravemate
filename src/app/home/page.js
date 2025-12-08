"use client";

import { useSession, signOut } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-10">Loading session...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
          >
            Sign Out
          </button>
        </div>

        {/* User Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center gap-4">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-orange-200"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                Welcome, {session?.user?.name}!
              </h2>
              <p className="text-gray-500">{session?.user?.email}</p>
            </div>
          </div>

          <hr />

          {/* Debug Info */}
          <div className="space-y-2">
            <h3 className="font-mono text-sm font-bold text-gray-500 uppercase tracking-wider">
              Database / Session Data
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(session, null, 2)}
            </pre>
            <p className="text-sm text-gray-500 italic">
              *If you see an ID here, your Database connection is working!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

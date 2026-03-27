import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-gray-600 mt-2">Page not found</p>
      </div>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Go back home
      </Link>
    </div>
  );
}

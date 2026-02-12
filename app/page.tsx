import { redirect } from 'next/navigation';

export default function Home() {
  // This will be replaced with actual auth check on the client
  redirect('/login');
}

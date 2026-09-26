import { AuthProvider } from '../context/AuthContext';
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>{children}</AuthProvider>
  );
}

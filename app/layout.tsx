import "../styles/globals.css";
import AuthProvider from "../components/AuthProvider";
import Layout from "../components/Layout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}



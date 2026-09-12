import "../styles/globals.css";
import AuthProvider from "../components/AuthProvider";
import Layout from "../components/Layout";

export const metadata = {
  title: "TaskTrackerHQ",
  description: "Tasks, calendars, and focus in one workspace.",
};

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


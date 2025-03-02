import './globals.css';
import './output.css';
import { AuthProvider } from './components/auth/AuthProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ConditionalFooter from './components/layout/ConditionalFooter';
import ConditionalNavbar from './components/layout/ConditionalNavbar';
import { ThemeProvider } from './components/ui/theme-provider';

export const metadata = {
  title: '顿慧人才库 - 人才管理系统',
  description: 'AI驱动的人才获取和管理平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ProtectedRoute>
              <div className="relative flex min-h-screen flex-col">
                <ConditionalNavbar />
                <main className="flex-1">{children}</main>
                <ConditionalFooter />
              </div>
            </ProtectedRoute>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

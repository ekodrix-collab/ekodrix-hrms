// This layout intentionally returns children directly so the print page
// can render its own complete <html>/<head>/<body> document without inheriting
// the root app layout's shell.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
    return children;
}

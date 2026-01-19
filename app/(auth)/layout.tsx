
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/50 p-4">
            <div className="w-full max-w-md space-y-4">
                <div className="flex justify-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Ekodrix<span className="text-green-600">HRMS</span></h1>
                </div>
                {children}
            </div>
        </div>
    )
}

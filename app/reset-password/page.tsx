import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { resetPassword } from './actions'

export default async function ResetPasswordPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if first login flag is set
    const isFirstLogin = user.user_metadata?.first_login === true

    if (!isFirstLogin) {
        redirect('/') // Already reset password, go to dashboard
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome! Reset Your Password</CardTitle>
                    <CardDescription>
                        For security, please set a new password for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={resetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                minLength={8}
                                placeholder="Enter new password (min 8 characters)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                placeholder="Confirm new password"
                            />
                        </div>

                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                            Set New Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

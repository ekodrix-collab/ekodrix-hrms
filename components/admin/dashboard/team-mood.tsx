"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Smile, Heart, Award, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function TeamMood() {
    return (
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold">Team Morale</CardTitle>
                        <CardDescription>Real-time employee sentiment</CardDescription>
                    </div>
                    <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-600">
                        <Heart className="h-5 w-5 fill-current" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-between items-end gap-2 h-20">
                    {[45, 75, 90, 65, 85].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${val}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-lg shadow-lg shadow-primary/20"
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="font-bold">Engagement Score</span>
                        </div>
                        <span className="font-black text-primary">88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">High Trust</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Smile className="h-4 w-4 text-green-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Positive Mood</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

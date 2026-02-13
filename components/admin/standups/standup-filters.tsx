"use client";

import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Label } from "../../ui/label";
import { FilterX } from "lucide-react";

export interface StandupEmployee {
    id: string;
    full_name: string;
    department: string | null;
}

interface StandupFiltersState {
    userId: string;
    startDate: string;
    endDate: string;
    hasBlockers: boolean;
}

interface StandupFiltersProps {
    employees: StandupEmployee[];
    filters: StandupFiltersState;
    onFilterChange: (filters: StandupFiltersState) => void;
    onReset: () => void;
}

export function StandupFilters({ employees, filters, onFilterChange, onReset }: StandupFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
            <div className="flex-1 min-w-[200px] space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Employee</Label>
                <Select
                    value={filters.userId}
                    onValueChange={(value) => onFilterChange({ ...filters, userId: value })}
                >
                    <SelectTrigger className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                        <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">From</Label>
                <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                    className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">To</Label>
                <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                    className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                />
            </div>

            <div className="flex items-center space-x-2 pb-3">
                <Checkbox
                    id="blockers"
                    checked={filters.hasBlockers}
                    onCheckedChange={(checked: boolean) => onFilterChange({ ...filters, hasBlockers: !!checked })}
                />
                <Label
                    htmlFor="blockers"
                    className="text-sm font-bold cursor-pointer select-none"
                >
                    Blockers Only
                </Label>
            </div>

            <Button
                variant="outline"
                onClick={onReset}
                className="gap-2 h-10 border-zinc-200 dark:border-zinc-800"
            >
                <FilterX className="h-4 w-4" />
                Reset
            </Button>
        </div>
    );
}

"use client";

import { useState } from "react";
import { X, Loader2, DollarSign } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";

interface CreateCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        cefr_level: "A1",
        description: "",
        price: "0",
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await fetchApi('/courses', {
                method: 'POST',
                body: JSON.stringify({ ...formData, price: parseFloat(formData.price) || 0 }),
            });
            onSuccess();
            onClose();
            router.refresh();
        } catch (error) {
            console.error("Failed to create course", error);
            alert("Failed to create course. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course Title
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                            placeholder="e.g. A1 Intensive German"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CEFR Level
                        </label>
                        <select
                            required
                            value={formData.cefr_level}
                            onChange={(e) => setFormData({ ...formData, cefr_level: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
                        >
                            <option value="A1">A1 Beginner</option>
                            <option value="A2">A2 Elementary</option>
                            <option value="B1">B1 Intermediate</option>
                            <option value="B2">B2 Upper Intermediate</option>
                            <option value="C1">C1 Advanced</option>
                            <option value="C2">C2 Mastery</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
                            placeholder="Brief description of the course content..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course Price
                            <span className="ml-1 text-xs font-normal text-gray-400">(GHS — set 0 for free)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">GH₵</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !formData.title}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Create Course
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { X, Loader2, Video, Headphones, Mic, AlignLeft } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface CreateLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    moduleId: string;
    nextOrderIndex: number;
}

export function CreateLessonModal({ isOpen, onClose, onSuccess, moduleId, nextOrderIndex }: CreateLessonModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        content_type: "video" as "video" | "reading" | "speaking" | "listening",
        content_data: "",
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await fetchApi(`/courses/modules/${moduleId}/lessons`, {
                method: 'POST',
                body: JSON.stringify({
                    title: formData.title,
                    content_type: formData.content_type,
                    content_data: { raw: formData.content_data },
                    order_index: nextOrderIndex
                }),
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create lesson", error);
            alert("Failed to create lesson. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Add New Lesson</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lesson Title
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                            placeholder="e.g. Grammar: Die Perfekt Tense"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Content Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, content_type: 'video' })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.content_type === 'video' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                            >
                                <Video className="w-6 h-6 mb-2" />
                                <span className="font-semibold text-sm">Video</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, content_type: 'reading' })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.content_type === 'reading' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                            >
                                <AlignLeft className="w-6 h-6 mb-2" />
                                <span className="font-semibold text-sm">Reading (Lesen)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, content_type: 'listening' })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.content_type === 'listening' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                            >
                                <Headphones className="w-6 h-6 mb-2" />
                                <span className="font-semibold text-sm">Listening (Hören)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, content_type: 'speaking' })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.content_type === 'speaking' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                            >
                                <Mic className="w-6 h-6 mb-2" />
                                <span className="font-semibold text-sm">Speaking (Sprechen)</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                            <span>Content Source / Payload</span>
                            <span className="text-xs text-gray-400 font-normal">
                                {formData.content_type === 'video' ? 'YouTube/Vimeo URL' : 'Rich Text or Prompt'}
                            </span>
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={formData.content_data}
                            onChange={(e) => setFormData({ ...formData, content_data: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                            placeholder={
                                formData.content_type === 'video' ? "https://youtube.com/watch?v=..." :
                                formData.content_type === 'speaking' ? "Enter AI Roleplay Scenario Prompt (e.g. 'You are a barista in Berlin...')" :
                                "Enter lesson text or content..."
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !formData.title || !formData.content_data}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Lesson
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

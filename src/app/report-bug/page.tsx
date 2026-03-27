'use client';

import { useState, useRef } from 'react';

export default function ReportBugPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gameMode: '',
    email: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateImage = (file: File): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (file.size > maxSize) {
      setError(`Image "${file.name}" is too large (max 5MB)`);
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setError(`"${file.name}" is not a supported image format. Use JPG, PNG, WebP, or GIF.`);
      return false;
    }
    
    return true;
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    
    if (files.length === 0) {
      setError('Please drop image files only.');
      return;
    }

    const validFiles = files.filter(validateImage);
    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles].slice(0, 4));
      if (validFiles.length + images.length > 4) {
        setError(`Only 4 images allowed. Added ${validFiles.length}, total is now limited to 4.`);
      }
    }
  };

  const handleImagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file && validateImage(file)) {
          setImages(prev => [...prev, file].slice(0, 4));
          setError('');
        }
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateImage);
    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles].slice(0, 4));
      setError('');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('gameMode', formData.gameMode);
      formDataObj.append('email', formData.email);
      
      for (let i = 0; i < images.length; i++) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            formDataObj.append(`image_${i}`, reader.result as string);
            resolve();
          };
          reader.readAsDataURL(images[i]);
        });
      }

      const response = await fetch('/api/report-bug', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) throw new Error('Failed to submit bug report');
      
      setSubmitted(true);
      setFormData({ title: '', description: '', gameMode: '', email: '' });
      setImages([]);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[900px] overflow-x-hidden px-4 py-8 sm:px-6">
      <section className="gv-panel p-6">
        <p className="gv-label">Support</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Report a Bug</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Found an issue? Let us know and help make GeoVault better.</p>

        {submitted && (
          <div className="mt-6 rounded-md border border-[var(--accent)] bg-transparent px-4 py-3 text-[var(--accent)]">
            ✅ Thank you! Your bug report has been submitted.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-[var(--accent-danger)] bg-transparent px-4 py-3 text-[var(--accent-danger)]">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Game Mode */}
          <div>
            <label htmlFor="gameMode" className="gv-label block">
              Game Mode <span className="text-[var(--accent-danger)]">(Optional)</span>
            </label>
            <select
              id="gameMode"
              name="gameMode"
              value={formData.gameMode}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Select a game mode...</option>
              <option value="country-rank">Country Rank</option>
              <option value="country-rank-europe">Country Rank Europe</option>
              <option value="hidden-country">Border Hunt</option>
              <option value="nation-match">Nation Links</option>
              <option value="country-matrix">Country Matrix</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Bug Title */}
          <div>
            <label htmlFor="title" className="gv-label block">
              Bug Title <span className="text-[var(--accent-danger)]">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Belgium shows wrong population"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="gv-label block">
              Description <span className="text-[var(--accent-danger)]">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onPaste={handleImagePaste}
              required
              rows={4}
              placeholder="Describe the bug in detail. What's happening and what should happen instead?"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="gv-label block">
              Screenshots or Images <span className="text-[var(--accent-danger)]">(Optional)</span>
            </label>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Drag & drop, paste (Ctrl+V), or click to upload. Max 4 images, 5MB each. JPG, PNG, WebP, GIF.
            </p>
            
            <div
              onDrop={handleImageDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              className={`mt-3 rounded-md border-2 border-dashed px-4 py-6 text-center transition ${
                dragActive
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
              >
                Click to upload
              </button>
              <p className="text-xs text-[var(--text-muted)]">or drag images here</p>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Preview ${idx}`}
                      className="h-20 w-full rounded-md border border-[var(--border)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-danger)] text-xs font-bold text-white hover:bg-[var(--accent-danger)]/80"
                    >
                      ✕
                    </button>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {img.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="gv-label block">
              Email <span className="text-[var(--accent-danger)]">(Optional - if you want a follow-up)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--bg-base)] disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Bug Report'}
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            >
              Back to Home
            </a>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Thank you for helping us improve GeoVault! 🌍
        </p>
      </section>
    </main>
  );
}

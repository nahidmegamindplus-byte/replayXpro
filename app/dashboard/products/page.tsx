'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Package,
  Plus,
  Search,
  Copy,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  Eye,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';

export default function ProductsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Upload States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [bulkPageId, setBulkPageId] = useState('ALL');
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStock, setSelectedStock] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');

  const [imageUrlInput, setImageUrlInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: 'অন্যান্য',
    price: '',
    discountPrice: '',
    stockQuantity: '10',
    stockStatus: 'IN_STOCK',
    imageUrl: '',
    images: [] as string[],
    deliveryInfo: '',
    productAiInstructions: '',
    productType: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
    digitalFileUrl: '',
    digitalInstructions: '',
    pageId: 'ALL',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStock !== 'ALL') params.append('stockStatus', selectedStock);
      if (selectedPage !== 'ALL') params.append('pageId', selectedPage);

      const [prodData, pageData] = await Promise.all([
        apiFetch<any>(`/api/products?${params.toString()}`, { retries: 2 }),
        apiFetch<any>('/api/pages', { retries: 2 }),
      ]);

      if (prodData?.success) {
        setProducts(Array.isArray(prodData.products) ? prodData.products : []);
        setCategories(Array.isArray(prodData.categories) ? prodData.categories : []);
      }

      if (pageData?.success) {
        setPages(Array.isArray(pageData.pages) ? pageData.pages : []);
      }
    } catch (err) {
      // Handled safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedPage, selectedCategory, selectedStock]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setImageUrlInput('');
    setFormData({
      name: '',
      description: '',
      sku: '',
      category: '',
      price: '',
      discountPrice: '',
      stockQuantity: '10',
      stockStatus: 'IN_STOCK',
      imageUrl: '',
      images: [],
      deliveryInfo: '',
      productAiInstructions: '',
      productType: 'PHYSICAL',
      digitalFileUrl: '',
      digitalInstructions: '',
      pageId: selectedPage !== 'ALL' ? selectedPage : 'ALL',
    });
    setImageUploadMode('upload');
    setShowModal(true);
  };

  // Sample CSV template generator
  const downloadSampleCsv = () => {
    const sampleHeaders = [
      'name',
      'price',
      'discountPrice',
      'stockQuantity',
      'sku',
      'category',
      'description',
      'imageUrl',
      'deliveryInfo',
    ];
    const sampleRows = [
      [
        '"প্রিমিয়াম সুতি পাঞ্জাবি"',
        '1450',
        '1250',
        '20',
        '"PANJ-01"',
        '"পোশাক"',
        '"১০০% কটন প্রিমিয়াম পাঞ্জাবি"',
        '"https://images.unsplash.com/photo-1598033129183-c4f50c736f10"',
        '"ঢাকায় ৬০ টাকা, বাইরে ১২০ টাকা"',
      ],
      [
        '"স্মার্ট ব্লুটুথ ওয়াচ"',
        '2200',
        '1850',
        '15',
        '"WATCH-02"',
        '"ইলেকট্রনিক্স"',
        '"ফুল টাচস্ক্রিন ব্লুটুথ কলিং স্মার্টওয়াচ"',
        '""',
        '"ক্যাশ অন ডেলিভারি প্রযোজ্য"',
      ],
    ];

    const content = '\uFEFF' + [sampleHeaders.join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'replyx_sample_products.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Client-side CSV Parser with proper quotes handling
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setBulkErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

        if (lines.length < 2) {
          setBulkErrors(['সিএসভি ফাইলে কোনো ডেটা পাওয়া যায়নি।']);
          return;
        }

        const parseRow = (row: string): string[] => {
          const res: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              if (inQuotes && row[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              res.push(cur.trim());
              cur = '';
            } else {
              cur += char;
            }
          }
          res.push(cur.trim());
          return res;
        };

        const rawHeaders = parseRow(lines[0]).map((h) =>
          h.toLowerCase().replace(/[^a-z0-9]/g, '')
        );

        const parsedItems: any[] = [];
        const errs: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const vals = parseRow(line);
          const rowData: Record<string, string> = {};
          rawHeaders.forEach((h, idx) => {
            rowData[h] = vals[idx] !== undefined ? vals[idx] : '';
          });

          const name = rowData.name || rowData.productname || rowData.title || '';
          const price = parseFloat(rowData.price || rowData.regularprice || '0');
          const discountPrice = rowData.discountprice || rowData.saleprice || '';
          const stock = parseInt(rowData.stockquantity || rowData.stock || '10', 10);

          if (!name.trim()) {
            errs.push(`সারি ${i + 1}: প্রোডাক্টের নাম নেই।`);
            continue;
          }
          if (isNaN(price) || price < 0) {
            errs.push(`সারি ${i + 1} (${name}): মূল্য সঠিক সংখ্যা হতে হবে।`);
            continue;
          }

          parsedItems.push({
            name: name.trim(),
            price,
            discountPrice: discountPrice ? parseFloat(discountPrice) : null,
            stockQuantity: isNaN(stock) ? 10 : stock,
            sku: rowData.sku || '',
            category: rowData.category || 'অন্যান্য',
            description: rowData.description || '',
            imageUrl: rowData.imageurl || rowData.image || '',
            deliveryInfo: rowData.deliveryinfo || '',
          });
        }

        setBulkProducts(parsedItems);
        setBulkErrors(errs);
      } catch (err: any) {
        setBulkErrors(['ফাইলটি পড়তে সমস্যা হয়েছে। সঠিক CSV ফরম্যাটে ফাইল আপলোড করুন।']);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCommitBulkUpload = async () => {
    if (bulkProducts.length === 0) {
      toast.error('আপলোড করার জন্য কোনো প্রোডাক্ট নির্বাচন করা হয়নি।');
      return;
    }

    setUploadingBulk(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: bulkProducts,
          defaultPageId: bulkPageId !== 'ALL' ? bulkPageId : undefined,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        toast.success(data.message || `${bulkProducts.length} টি প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!`);
        setShowBulkModal(false);
        setBulkProducts([]);
        setCsvFileName('');
        fetchProducts();
      } else {
        toast.error(data?.error || 'বাল্ক আপলোড ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleOpenEdit = (p: any) => {
    setIsEditing(true);
    setCurrentId(p.id);
    setImageUrlInput('');

    let initialImages: string[] = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
      initialImages = p.images;
    } else if (p.imageUrl) {
      initialImages = [p.imageUrl];
    }

    setFormData({
      name: p.name,
      description: p.description || '',
      sku: p.sku || '',
      category: p.category || '',
      price: p.price.toString(),
      discountPrice: p.discountPrice ? p.discountPrice.toString() : '',
      stockQuantity: p.stockQuantity.toString(),
      stockStatus: p.stockStatus,
      imageUrl: p.imageUrl || (initialImages[0] || ''),
      images: initialImages,
      deliveryInfo: p.deliveryInfo || '',
      productAiInstructions: p.productAiInstructions || '',
      productType: p.productType || 'PHYSICAL',
      digitalFileUrl: p.digitalFileUrl || '',
      digitalInstructions: p.digitalInstructions || '',
      pageId: p.pageId || 'ALL',
    });
    setImageUploadMode(p.imageUrl?.startsWith('data:') ? 'upload' : 'url');
    setShowModal(true);
  };

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newImages: string[] = [];

    for (const file of fileList) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} এর সাইজ ১৫ মেগাবাইটের বেশি। এটি বাদ দেওয়া হয়েছে।`);
        continue;
      }
      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (err) {
        console.error('Image compression failed:', err);
        toast.error(`${file.name} প্রসেস করতে ব্যর্থ হয়েছে।`);
      }
    }

    if (newImages.length > 0) {
      setFormData((prev) => {
        const combined = [...(prev.images || []), ...newImages];
        return {
          ...prev,
          images: combined,
          imageUrl: combined[0] || '',
        };
      });
      toast.success(`${newImages.length}টি ছবি যুক্ত করা হয়েছে!`);
    }

    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setFormData((prev) => {
      const combined = [...(prev.images || []), url];
      return {
        ...prev,
        images: combined,
        imageUrl: combined[0] || '',
      };
    });
    setImageUrlInput('');
    toast.success('ছবির লিংক যুক্ত হয়েছে!');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const updated = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setFormData((prev) => {
      const currentList = [...(prev.images || [])];
      const selected = currentList.splice(indexToPrimary, 1)[0];
      const reordered = [selected, ...currentList];
      return {
        ...prev,
        images: reordered,
        imageUrl: reordered[0] || '',
      };
    });
    toast.success('প্রধান ছবি নির্ধারণ করা হয়েছে!');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isEditing ? `/api/products/${currentId}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'প্রোডাক্ট সংরক্ষণ ব্যর্থ হয়েছে।');
        setSaving(false);
        return;
      }

      toast.success(isEditing ? 'প্রোডাক্ট সফলভাবে আপডেট হয়েছে!' : 'নতুন প্রোডাক্ট যুক্ত হয়েছে!');
      setShowModal(false);
      fetchProducts();
    } catch (e) {
      toast.error('সার্ভার ত্রুটি।');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('প্রোডাক্ট সফলভাবে ডুপ্লিকেট হয়েছে!');
        fetchProducts();
      } else {
        toast.error(data.error || 'ডুপ্লিকেট করতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('ত্রুটি হয়েছে।');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`আপনি কি "${name}" মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('প্রোডাক্ট মুছে ফেলা হয়েছে।');
        fetchProducts();
      } else {
        toast.error(data.error || 'মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      toast.error('ত্রুটি হয়েছে।');
    }
  };

  return (
    <DashboardLayout
      title="প্রোডাক্ট ইনভেন্টরি"
      subtitle="পেজ অনুযায়ী পণ্য তালিকা ও ছবি পরিচালনা; মেসেঞ্জারে AI গ্রাহকদের এই ডাটা থেকে সঠিক উত্তর ও ছবি পাঠাবে"
    >
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নাম, কোড (SKU) দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Facebook Page Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none py-1 pr-2"
            >
              <option value="ALL">সকল Facebook Pages</option>
              {(pages || []).map((pg) => (
                <option key={pg.id} value={pg.id}>
                  📄 {pg.pageName}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">সকল ক্যাটাগরি</option>
            {(categories || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">সকল স্টক অবস্থা</option>
            <option value="IN_STOCK">স্টকে আছে (In Stock)</option>
            <option value="OUT_OF_STOCK">স্টক শেষ (Out of Stock)</option>
            <option value="PRE_ORDER">প্রি-অর্ডার (Pre Order)</option>
          </select>

          {/* Product Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">সকল ধরন (ফিজিক্যাল ও ডিজিটাল)</option>
            <option value="PHYSICAL">📦 ফিজিক্যাল পণ্য</option>
            <option value="DIGITAL">⚡ ডিজিটাল পণ্য</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setBulkProducts([]);
              setBulkErrors([]);
              setCsvFileName('');
              setShowBulkModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs transition-all"
            title="CSV ফাইল থেকে একসাথে একাধিক প্রোডাক্ট আপলোড করুন"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>বাল্ক CSV আপলোড</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন প্রোডাক্ট যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Product Grid / Cards */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">প্রোডাক্ট লোড হচ্ছে...</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-200">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">কোনো প্রোডাক্ট পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            AI যেন মেসেঞ্জারে গ্রাহকদের সঠিক দাম, বিবরণ ও পণ্যের ছবি দেখাতে পারে, সেজন্য আপনার প্রোডাক্টগুলো এখানে যুক্ত করুন।
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> নতুন প্রোডাক্ট যোগ করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products
            .filter((p) => selectedType === 'ALL' || (p.productType || 'PHYSICAL') === selectedType)
            .map((p) => {
              const isDigital = p.productType === 'DIGITAL';
              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Product Image & Badges */}
                    <div className="relative w-full h-48 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden mb-4 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          {isDigital ? (
                            <Zap className="w-10 h-10 stroke-1 text-amber-500" />
                          ) : (
                            <ImageIcon className="w-10 h-10 stroke-1" />
                          )}
                          <span className="text-[11px]">{isDigital ? 'ডিজিটাল প্রোডাক্ট' : 'ছবি নেই'}</span>
                        </div>
                      )}

                      {/* Price Tag */}
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-bold text-indigo-700 shadow-xs">
                        {p.discountPrice ? `${p.discountPrice} ৳` : `${p.price} ৳`}
                        {p.discountPrice && (
                          <span className="text-[10px] line-through text-slate-400 ml-1.5">{p.price} ৳</span>
                        )}
                      </div>

                      {/* Product Type & Category Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        {isDigital ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                            <Zap className="w-3 h-3" /> ডিজিটাল
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                            <Package className="w-3 h-3" /> ফিজিক্যাল
                          </span>
                        )}
                        {p.category && (
                          <div className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[10px] font-semibold text-slate-700 border border-slate-200 shadow-2xs">
                            {p.category}
                          </div>
                        )}
                      </div>

                      {/* Connected Page Badge */}
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-semibold text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs">
                        <Layers className="w-3 h-3 text-indigo-600" />
                        <span>{p.page ? p.page.pageName : 'সকল Page (Global)'}</span>
                      </div>

                      {/* Multi-Image Badge */}
                      {p.images && p.images.length > 1 && (
                        <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 shadow-2xs">
                          <ImageIcon className="w-3 h-3 text-indigo-300" />
                          <span>{p.images.length}টি ছবি</span>
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {p.description || 'কোনো বিবরণ যোগ করা হয়নি।'}
                    </p>

                    {/* Digital Product Delivery Notice Banner */}
                    {isDigital ? (
                      <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/90 text-[11px] text-amber-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>ইনস্ট্যান্ট ইমেইল ডেলিভারি (৳০)</span>
                        </span>
                        {p.digitalFileUrl ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                            ফাইল লিঙ্ক প্রস্তুত ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">লিংক নেই</span>
                        )}
                      </div>
                    ) : null}

                    {/* Stock and SKU */}
                    <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {isDigital ? (
                          <span className="text-amber-700 flex items-center gap-1 text-[11px] font-medium">
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> ডিজিটাল এক্সেস (আনলিমিটেড)
                          </span>
                        ) : p.stockStatus === 'IN_STOCK' ? (
                          <span className="text-emerald-700 flex items-center gap-1 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> স্টকে আছে ({p.stockQuantity}টি)
                          </span>
                        ) : p.stockStatus === 'PRE_ORDER' ? (
                          <span className="text-amber-700 flex items-center gap-1 text-[11px] font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> প্রি-অর্ডার
                          </span>
                        ) : (
                          <span className="text-rose-700 flex items-center gap-1 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> স্টক শেষ
                          </span>
                        )}
                      </div>
                      {p.sku && <span className="font-mono text-[11px] text-slate-400">SKU: {p.sku}</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => handleDuplicate(p.id)}
                      title="ডুপ্লিকেট করুন"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold border border-slate-200/80 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>এডিট</span>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="মুছে ফেলুন"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {isEditing ? 'প্রোডাক্ট তথ্য পরিবর্তন করুন' : 'নতুন প্রোডাক্ট যুক্ত করুন'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">AI এই তথ্যের উপর ভিত্তি করে পেজের কাস্টমারদের উত্তর ও ছবি প্রদান করবে</p>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Facebook Page Assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>সংযুক্ত Facebook Page নির্ধারণ করুন</span>
                </label>
                <select
                  value={formData.pageId}
                  onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ALL">🌐 সকল সংযুক্ত Facebook Pages (গ্লোবাল পণ্য)</option>
                  {(pages || []).map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      📄 {pg.pageName} (ID: {pg.facebookPageId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>পণ্যের ধরন (Product Type)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        productType: 'PHYSICAL',
                        deliveryInfo:
                          formData.deliveryInfo === 'ইনস্ট্যান্ট ইমেইল ডেলিভারি (৳০)' ? '' : formData.deliveryInfo,
                      })
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                      formData.productType === 'PHYSICAL'
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        formData.productType === 'PHYSICAL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">📦 ফিজিক্যাল পণ্য</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">কুরিয়ারে ডেলিভারি (পোশাক, জুতা, ঘড়ি ইত্যাদি)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        productType: 'DIGITAL',
                        deliveryInfo: formData.deliveryInfo || 'ইনস্ট্যান্ট ইমেইল ডেলিভারি (৳০)',
                        stockQuantity: '999999',
                        stockStatus: 'IN_STOCK',
                      })
                    }
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                      formData.productType === 'DIGITAL'
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-medium shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        formData.productType === 'DIGITAL' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900">⚡ ডিজিটাল পণ্য</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">পেমেন্ট হলেই ইমেইলে সাথে সাথে ফাইল লিংক ও লাইসেন্স চলে যাবে</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  পণ্যের নাম (Product Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="যেমন: প্রিমিয়াম কটন পাঞ্জাবি"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    মূল্য (Regular Price ৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="যেমন: 1850"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    অফার মূল্য (Discount Price ৳)
                  </label>
                  <input
                    type="number"
                    value={formData.discountPrice}
                    onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                    placeholder="যেমন: 1490"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Category, SKU, Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    ক্যাটাগরি
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="পাঞ্জাবি / জুতা"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    SKU / কোড
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="PJB-001"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    স্টক অবস্থা
                  </label>
                  <select
                    value={formData.stockStatus}
                    onChange={(e) => setFormData({ ...formData, stockStatus: e.target.value })}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="IN_STOCK">ইন স্টক</option>
                    <option value="OUT_OF_STOCK">স্টক শেষ</option>
                    <option value="PRE_ORDER">প্রি-অর্ডার</option>
                  </select>
                </div>
              </div>

              {/* Product Image Section (Upload & URL) */}
              {/* Product Images (Multiple Images Support) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>প্রোডাক্টের ছবিসমূহ (Product Images)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      একাধিক ছবি (রং, সাইজ বা ভ্যারিয়েশন) যোগ করতে পারেন (
                      <strong className="text-indigo-600">{formData.images?.length || 0}টি ছবি যুক্ত আছে</strong>)
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('upload')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                        imageUploadMode === 'upload'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ফাইল আপলোড
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('url')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                        imageUploadMode === 'url'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Multi-Image Gallery Grid */}
                {formData.images && formData.images.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                      {formData.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs aspect-square flex items-center justify-center hover:border-indigo-300 transition-all"
                        >
                          <img
                            src={img}
                            alt={`Product preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Primary Badge or Action */}
                          {idx === 0 ? (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-indigo-600/90 backdrop-blur-xs text-white text-[9px] font-bold shadow-xs">
                              প্রধান ছবি
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 hover:bg-indigo-600 text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-all"
                              title="এই ছবিকে প্রধান ছবি বানান"
                            >
                              প্রধান করুন
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-colors shadow-xs"
                            title="এই ছবিটি মুছুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Index number badge */}
                          <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white bg-black/50 px-1 rounded">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload or URL Inputs */}
                {imageUploadMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
                    >
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>
                        {formData.images?.length > 0
                          ? '+ আরও ছবি যোগ করুন (Select More Images)'
                          : 'কম্পিউটার/মোবাইল থেকে এক বা একাধিক ছবি সিলেক্ট করুন'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="https://example.com/product-image.jpg"
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0"
                    >
                      যোগ করুন
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span className="text-indigo-600 font-bold">💡 টিপ:</span>
                  <span>১ম ছবিটি প্রধান ছবি হবে। পেজ সেটিংসে নির্ধারিত সংখ্যা অনুযায়ী AI একসাথে একাধিক ছবি পাঠাতে পারবে।</span>
                </div>
              </div>

              {/* Digital Product Delivery Information Section */}
              {formData.productType === 'DIGITAL' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/90 space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">ডিজিটাল ইনস্ট্যান্ট ডেলিভারি সেটআপ (Instant Email Delivery)</h4>
                      <p className="text-[10px] text-amber-800">
                        কাস্টমার পেমেন্ট/অর্ডার কনফার্ম করার সাথে সাথেই এই ডাউনলোড লিংক ও লাইসেন্স তার ইমেইলে চলে যাবে।
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>ডিজিটাল ফাইল বা ডাউনলোড লিংক (URL)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.digitalFileUrl}
                      onChange={(e) => setFormData({ ...formData, digitalFileUrl: e.target.value })}
                      placeholder="https://drive.google.com/file/d/... বা https://dropbox.com/..."
                      className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      গ্রাহক তার ইমেইলে একটি বড় "ডাউনলোড করুন" বোতাম পাবে যা এই লিংকে নিয়ে যাবে।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-amber-600" />
                      <span>লাইসেন্স কী / অ্যাক্সেস নির্দেশনা (License Key / Credentials)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.digitalInstructions}
                      onChange={(e) => setFormData({ ...formData, digitalInstructions: e.target.value })}
                      placeholder="লাইসেন্স কী: XXXX-YYYY-ZZZZ, অথবা পাসওয়ার্ড ও ব্যবহারের নিয়মাবলী..."
                      className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      ইমেইলে এটি সুন্দর একটি হাইলাইট বক্সে দেখানো হবে যা কাস্টমার ১-ক্লিকে কপি করতে পারবেন।
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  প্রোডাক্টের বিবরণ (Description)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="উপাদান, সাইজ বা অন্যান্য বৈশিষ্ট্য..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Delivery Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  ডেলিভারি তথ্য
                </label>
                <input
                  type="text"
                  value={formData.deliveryInfo}
                  onChange={(e) => setFormData({ ...formData, deliveryInfo: e.target.value })}
                  placeholder="যেমন: ঢাকা ৭০ টাকা, বাইরে ১৩০ টাকা। ক্যাশ অন ডেলিভারি আছে।"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Product Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">বাল্ক প্রোডাক্ট আপলোড (Bulk CSV)</h3>
                <p className="text-xs text-slate-500">একসাথে শত শত প্রোডাক্ট CSV ফাইলের মাধ্যমে আপলোড করুন</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Template Download & Page Selection */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-700">
                  <p className="font-semibold text-slate-900 mb-0.5">সঠিক ফরম্যাটে CSV তৈরি করতে চান?</p>
                  <p className="text-[11px] text-slate-500">আমাদের নমুনা ফাইলটি ডাউনলোড করে আপনার প্রোডাক্টের ডাটা বসান</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-2xs transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>নমুনা CSV ডাউনলোড</span>
                </button>
              </div>

              {/* Default Facebook Page Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কোন Facebook পেজের জন্য প্রযোজ্য?
                </label>
                <select
                  value={bulkPageId}
                  onChange={(e) => setBulkPageId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ALL">সকল Facebook Pages</option>
                  {(pages || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pageName}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Drop Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CSV ফাইল নির্বাচন করুন</label>
                <input
                  type="file"
                  ref={csvInputRef}
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => csvInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/20"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  {csvFileName ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900">{csvFileName}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        ✓ {bulkProducts.length} টি প্রোডাক্ট সফলভাবে সনাক্ত হয়েছে
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">ফাইল নির্বাচন করতে এখানে ক্লিক করুন</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">শুধুমাত্র .csv ফাইল সমর্থিত</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Warnings */}
              {bulkErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" /> কিছু সারিতে ত্রুটি পাওয়া গেছে:
                  </p>
                  <ul className="text-[11px] text-rose-700 list-disc list-inside space-y-0.5">
                    {bulkErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {bulkProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">
                      আপলোডের প্রিভিউ ({bulkProducts.length} টি প্রোডাক্ট):
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2 px-3">নাম</th>
                          <th className="py-2 px-3">মূল্য</th>
                          <th className="py-2 px-3">অফার মূল্য</th>
                          <th className="py-2 px-3">স্টক</th>
                          <th className="py-2 px-3">ক্যাটাগরি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkProducts.slice(0, 50).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-slate-900 truncate max-w-[150px]">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-3 font-mono">{item.price} ৳</td>
                            <td className="py-1.5 px-3 font-mono text-emerald-600">
                              {item.discountPrice ? `${item.discountPrice} ৳` : '-'}
                            </td>
                            <td className="py-1.5 px-3">{item.stockQuantity}</td>
                            <td className="py-1.5 px-3 text-slate-500">{item.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={uploadingBulk || bulkProducts.length === 0}
                  onClick={handleCommitBulkUpload}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                >
                  {uploadingBulk ? (
                    <span>আপলোড করা হচ্ছে...</span>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{bulkProducts.length} টি প্রোডাক্ট ইমপোর্ট করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

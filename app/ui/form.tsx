'use client';

import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

interface Item {
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  currency: string | null;
  total: number;
}

interface FormData {
  id: string;
  invoice: string;
  date: string;
  dueDate: string;
  type: string;
  companyName: string;
  address: string;
  postcode: string;
  telephone: string;
  email: string;
  toName: string;
  toAddress: string;
  toCity: string;
  toPostcode: string;
  message: string;
  payInfo: string;
  terms: string;
  currency: string;
  items: Item[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  logo: File | null;
  template: ArrayBuffer | null;
}

export default function Form() {
  const [formData, setFormData] = useState<FormData>({
    id: '',
    invoice: '',
    date: '',
    dueDate: '',
    type: 'Invoice',
    companyName: '',
    address: '',
    postcode: '',
    telephone: '',
    email: '',
    toName: '',
    toAddress: '',
    toCity: '',
    toPostcode: '',
    message: '',
    payInfo: '',
    terms: '',
    currency: '',
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    notes: '',
    logo: null,
    template: null
  });
  
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 0, unitPrice: 0, cost: 0, currency: formData.currency, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof Item, value: string) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const numValue = Number(value) || 0;
      item[field] = numValue;
      // Recalculate total
      item.total = item.quantity * item.unitPrice;
      
      // Update the item
      newItems[index] = item;
      
      // Recalculate subtotal
      const subtotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
      
      setFormData(prev => ({
        ...prev,
        items: newItems,
        subtotal,
        total: Number((subtotal + (subtotal * prev.tax / 100) - (subtotal * prev.discount / 100)).toFixed(2))
      }));
    } else if (field === 'description') {
      item[field] = value;
      newItems[index] = item;
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  useEffect(() => {
    // Load the template file when component mounts
    fetch('/BusinessInvoiceBasic.docx')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load template');
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        setFormData(prev => ({
          ...prev,
          template: buffer
        }));
      })
      .catch(error => {
        console.error('Error loading template:', error);
      });
  }, []);

  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    setFormData(prev => ({
      ...prev,
      subtotal,
      total: Number((subtotal + (subtotal * prev.tax / 100) - (subtotal * prev.discount / 100)).toFixed(2))
    }));
  }, [formData.items, formData.tax, formData.discount]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type || 'Invoice');
      formDataToSend.append('companyName', formData.companyName || '');
      formDataToSend.append('address', formData.address || '');
      formDataToSend.append('postcode', formData.postcode || '');
      formDataToSend.append('telephone', formData.telephone || '');
      formDataToSend.append('email', formData.email || '');
      formDataToSend.append('toName', formData.toName || '');
      formDataToSend.append('toAddress', formData.toAddress || '');
      formDataToSend.append('toCity', formData.toCity || '');
      formDataToSend.append('toPostcode', formData.toPostcode || '');
      formDataToSend.append('message', formData.message || '');
      formDataToSend.append('payInfo', formData.payInfo || '');
      formDataToSend.append('terms', formData.terms || '');
      formDataToSend.append('currency', formData.currency || '$');
      formDataToSend.append('items', JSON.stringify(formData.items || []));
      formDataToSend.append('subtotal', (formData.subtotal || 0).toString());
      formDataToSend.append('tax', (formData.tax || 0).toString());
      formDataToSend.append('discount', (formData.discount || 0).toString());

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formDataToSend,
      });

      // Check content type to determine how to handle the response
      const contentType = response.headers.get('Content-Type');
      
      if (!response.ok) {
        // If it's JSON, parse the error
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        } else {
          throw new Error('Failed to generate PDF');
        }
      }

      // If it's a PDF, handle the download
      if (contentType?.includes('application/pdf')) {
        // Get the filename from the Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'invoice.pdf';

        // Convert response to blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        throw new Error('Unexpected response format');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      alert(error instanceof Error ? error.message : 'An error occurred during conversion');
    }
  };

  return (
    <div className="p-6 bg-base-100 rounded-lg">
      <h2 className="text-2xl font-semibold text-primary mb-6">Create Invoice</h2>

      <form onSubmit={handleSubmit} className="space-y-6 text-base-content">
        {/* Type Selection and Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text text-base-content">Type</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="select select-bordered w-full text-base-content"
            >
              <option value="Invoice">Invoice</option>
              <option value="Quote">Quote</option>
              <option value="Receipt">Receipt</option>
            </select>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-base-content">From</h3>
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={formData.companyName}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="text"
              name="postcode"
              placeholder="Postcode"
              value={formData.postcode}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="tel"
              name="telephone"
              placeholder="Telephone"
              value={formData.telephone}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
          </div>

          {/* To Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-base-content">To</h3>
            <input
              type="text"
              name="toName"
              placeholder="Client Name"
              value={formData.toName}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="text"
              name="toAddress"
              placeholder="Address"
              value={formData.toAddress}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="text"
              name="toCity"
              placeholder="City"
              value={formData.toCity}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
            <input
              type="text"
              name="toPostcode"
              placeholder="Postcode"
              value={formData.toPostcode}
              onChange={handleInputChange}
              className="input input-bordered w-full text-base-content"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-base-content">Items</h3>
          
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 font-semibold mb-2">
            <div className="col-span-6">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2 flex items-center gap-2">
              Total
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="select select-bordered select-sm"
              >
                <option value=""></option>
                <option value="£">£</option>
                <option value="$">$</option>
                <option value="€">€</option>
              </select>
            </div>
          </div>

          {/* Table Body */}
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-6">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  placeholder="Item description"
                  className="input input-bordered w-full text-base-content"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  placeholder="0"
                  className="input input-bordered w-full text-base-content"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  placeholder="0.00"
                  className="input input-bordered w-full text-base-content"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span>{formData.currency}{item.total.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="btn btn-outline btn-primary"
          >
            Add Item
          </button>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-base-content">Additional Information</h3>
            {formData.type === 'Invoice' && (
              <>
                <textarea
                  name="message"
                  placeholder="Message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full text-base-content"
                />
                <textarea
                  name="payInfo"
                  placeholder="Payment Information"
                  value={formData.payInfo}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full text-base-content"
                />
              </>
            )}
            {formData.type === 'Quote' && (
              <textarea
                name="terms"
                placeholder="Terms and Conditions"
                value={formData.terms}
                onChange={handleInputChange}
                className="textarea textarea-bordered w-full text-base-content"
              />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-base-content">Totals</h3>
            <div className="text-right space-y-2">
              <div>Subtotal: {formData.currency}{formData.subtotal.toFixed(2)}</div>
              <div className="flex items-center justify-end gap-2">
                <label>Tax %:</label>
                <input
                  type="number"
                  name="tax"
                  value={formData.tax}
                  onChange={handleInputChange}
                  className="input input-bordered w-24 text-base-content"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <label>Discount %:</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  className="input input-bordered w-24 text-base-content"
                />
              </div>
              <div className="text-lg font-bold">
                Total: {formData.currency}{formData.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
import { useState } from "react";
import { Plus, Edit2, Trash2, MapPin, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddresses, UserAddress } from "@/hooks/useAddresses";

interface AddressManagerProps {
  onSelect?: (address: UserAddress) => void;
  selectedId?: string;
  showSelectMode?: boolean;
}

const AddressManager = ({ onSelect, selectedId, showSelectMode = false }: AddressManagerProps) => {
  const { addresses, isLoading, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [formData, setFormData] = useState({
    label: "Home",
    full_name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "Nagpur",
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      label: "Home",
      full_name: "",
      phone: "",
      address: "",
      pincode: "",
      city: "Nagpur",
      is_default: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAddress) {
      const success = await updateAddress(editingAddress.id, formData);
      if (success) resetForm();
    } else {
      const result = await addAddress(formData);
      if (result) resetForm();
    }
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      address: address.address,
      pincode: address.pincode,
      city: address.city,
      is_default: address.is_default,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      await deleteAddress(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address List */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              onClick={() => showSelectMode && onSelect?.(address)}
              className={`p-4 rounded-lg border transition-all ${
                showSelectMode ? "cursor-pointer hover:border-primary" : ""
              } ${
                selectedId === address.id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{address.label}</span>
                    {address.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                    {selectedId === address.id && showSelectMode && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="font-medium text-sm">{address.full_name}</p>
                  <p className="text-sm text-muted-foreground">{address.phone}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {address.address}, {address.city} - {address.pincode}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  {!showSelectMode && (
                    <>
                      {!address.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultAddress(address.id);
                          }}
                          className="text-xs"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(address);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(address.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Address Button */}
      {!showForm && (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Address
        </Button>
      )}

      {/* Address Form */}
      {showForm && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-medium mb-4">
            {editingAddress ? "Edit Address" : "Add New Address"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Label</label>
                <select
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Phone / WhatsApp *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                placeholder="Your contact number"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Full Address *</label>
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
                placeholder="House no, street, area, landmark"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="440001"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="Nagpur"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              Set as default address
            </label>

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm">
                {editingAddress ? "Update" : "Save"} Address
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No saved addresses. Add one to save time during checkout!
        </p>
      )}
    </div>
  );
};

export default AddressManager;

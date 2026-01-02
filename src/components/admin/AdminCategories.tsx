import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Apple,
  Carrot,
  Leaf,
  Sprout,
  Package,
  Cherry,
  Citrus,
  Grape,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, Category, Subcategory } from "@/hooks/useCategories";
import { Badge } from "@/components/ui/badge";

const ICON_OPTIONS = [
  { value: "Apple", label: "Apple", icon: Apple },
  { value: "Carrot", label: "Carrot", icon: Carrot },
  { value: "Leaf", label: "Leaf", icon: Leaf },
  { value: "Sprout", label: "Sprout", icon: Sprout },
  { value: "Package", label: "Package", icon: Package },
  { value: "Cherry", label: "Cherry", icon: Cherry },
  { value: "Citrus", label: "Citrus", icon: Citrus },
  { value: "Grape", label: "Grape", icon: Grape },
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find((opt) => opt.value === iconName);
  return iconOption?.icon || Package;
};

const AdminCategories = () => {
  const {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryVisibility,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleSubcategoryVisibility,
  } = useCategories(true);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Form states for category
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    icon: "Package",
    display_order: 0,
    is_hidden: false,
  });

  // Form states for subcategory
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    slug: "",
    display_order: 0,
    is_hidden: false,
  });

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        display_order: category.display_order,
        is_hidden: category.is_hidden,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        slug: "",
        icon: "Package",
        display_order: categories.length + 1,
        is_hidden: false,
      });
    }
    setCategoryDialogOpen(true);
  };

  const openSubcategoryDialog = (categoryId: string, subcategory?: Subcategory) => {
    setSelectedCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryForm({
        name: subcategory.name,
        slug: subcategory.slug,
        display_order: subcategory.display_order,
        is_hidden: subcategory.is_hidden,
      });
    } else {
      setEditingSubcategory(null);
      const category = categories.find((c) => c.id === categoryId);
      setSubcategoryForm({
        name: "",
        slug: "",
        display_order: (category?.subcategories?.length || 0) + 1,
        is_hidden: false,
      });
    }
    setSubcategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) return;

    if (editingCategory) {
      await updateCategory(editingCategory.id, categoryForm);
    } else {
      await addCategory(categoryForm);
    }
    setCategoryDialogOpen(false);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name || !subcategoryForm.slug) return;

    if (editingSubcategory) {
      await updateSubcategory(editingSubcategory.id, subcategoryForm);
    } else {
      await addSubcategory({
        ...subcategoryForm,
        category_id: selectedCategoryId,
      });
    }
    setSubcategoryDialogOpen(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage product categories and subcategories
          </p>
        </div>
        <Button onClick={() => openCategoryDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div
              key={category.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleExpanded(category.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    {category.is_hidden && (
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.subcategories?.length || 0} subcategories
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleCategoryVisibility(category.id, !category.is_hidden)
                    }
                  >
                    {category.is_hidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openCategoryDialog(category)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{category.name}" and all its
                          subcategories. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCategory(category.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Subcategories */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30">
                  <div className="p-4 space-y-2">
                    {category.subcategories?.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sub.name}</span>
                            {sub.is_hidden && (
                              <Badge variant="secondary" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            /{sub.slug}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleSubcategoryVisibility(sub.id, !sub.is_hidden)
                            }
                          >
                            {sub.is_hidden ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSubcategoryDialog(category.id, sub)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Subcategory?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{sub.name}". This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSubcategory(sub.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => openSubcategoryDialog(category.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Subcategory
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No categories found. Add your first category to get started.
          </div>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCategoryForm({
                    ...categoryForm,
                    name,
                    slug: editingCategory ? categoryForm.slug : generateSlug(name),
                  });
                }}
                placeholder="e.g., Fruits"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={categoryForm.slug}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, slug: e.target.value })
                }
                placeholder="e.g., fruits"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(value) =>
                  setCategoryForm({ ...categoryForm, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                value={categoryForm.display_order}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? "Edit Subcategory" : "Add Subcategory"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Name</Label>
              <Input
                id="sub-name"
                value={subcategoryForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setSubcategoryForm({
                    ...subcategoryForm,
                    name,
                    slug: editingSubcategory
                      ? subcategoryForm.slug
                      : generateSlug(name),
                  });
                }}
                placeholder="e.g., Seasonal Fruits"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-slug">Slug</Label>
              <Input
                id="sub-slug"
                value={subcategoryForm.slug}
                onChange={(e) =>
                  setSubcategoryForm({ ...subcategoryForm, slug: e.target.value })
                }
                placeholder="e.g., seasonal-fruits"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-order">Display Order</Label>
              <Input
                id="sub-order"
                type="number"
                value={subcategoryForm.display_order}
                onChange={(e) =>
                  setSubcategoryForm({
                    ...subcategoryForm,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubcategory}>
              {editingSubcategory ? "Save Changes" : "Add Subcategory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;

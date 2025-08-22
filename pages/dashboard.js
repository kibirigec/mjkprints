"use client";
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import Footer from "../components/Footer";
import DashboardTable from "../components/DashboardTable";
import ProductModal from "../components/ProductModal";
import PasscodeProtection from "../components/PasscodeProtection";
import { useAdminAuth } from "../context/AdminAuthContext";
import { supabase } from "../../lib/supabase/client"; // ✅ fixed: import at top

export default function Dashboard() {
  const { logout, updateActivity } = useAdminAuth();
  const [products, setProducts] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  const [fileTypeFilter, setFileTypeFilter] = useState("all"); // 'all', 'pdf', 'image'

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [editingProduct, setEditingProduct] = useState(null);

  // --- fetch products ---
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } else {
      setProducts(data);
    }
    setIsLoading(false);
  }, []);

  // --- fetch files ---
  const fetchFiles = useCallback(async () => {
    setIsFilesLoading(true);
    try {
      const { data: fileUploads, error: fileError } = await supabase
        .from("file_uploads")
        .select("*");

      if (fileError) {
        console.error("Error fetching file_uploads:", fileError);
        setFiles([]);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, title, pdf_file_id, image_file_id");

      if (productsError) {
        console.error("Error fetching products for file linking:", productsError);
      }

      const allFiles = [];
      if (Array.isArray(fileUploads)) {
        fileUploads.forEach((file) => {
          const referencingProduct = productsData?.find(
            (product) =>
              product.pdf_file_id === file.id ||
              product.image_file_id === file.id
          );

          allFiles.push({
            ...file,
            product_title: referencingProduct?.title || null,
            product_id: referencingProduct?.id || null,
            is_orphaned: !referencingProduct,
            file_status: referencingProduct ? "linked" : "orphaned",
          });
        });
      }

      allFiles.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setFiles(allFiles);
    } catch (err) {
      console.error("Error fetching files:", err);
      setFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  }, []);

  // --- delete file ---
  const handleDeleteFile = useCallback(
    async (fileId, fileName) => {
      console.log("Deleting file:", fileId, fileName);

      const fileToDelete = files.find((f) => f.id === fileId);
      if (!fileToDelete) {
        alert("File not found!");
        return;
      }

      const fileType =
        fileToDelete.file_type === "pdf" ? "PDF file" : "Image file";
      const linkStatus = fileToDelete.is_orphaned
        ? "NOT linked to any product"
        : `linked to product: "${fileToDelete.product_title}"`;

      const confirmMessage = `🗑️ DELETE ${fileType.toUpperCase()}

File: "${fileName}"
Type: ${fileType}
Status: ${linkStatus}
Storage: ${fileToDelete.storage_path}

Are you sure you want to permanently delete this ${fileType}?`;

      if (!confirm(confirmMessage)) {
        return;
      }

      setIsDeletingFile(fileId);

      try {
        const { error: storageError } = await supabase.storage
          .from("mjk-prints-storage")
          .remove([fileToDelete.storage_path]);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
          alert(
            `Failed to delete file from storage: ${storageError.message}`
          );
          return;
        }

        const { error: dbError } = await supabase
          .from("file_uploads")
          .delete()
          .eq("id", fileId);

        if (dbError) {
          console.error("Database deletion error:", dbError);
          alert(`Failed to delete file record: ${dbError.message}`);
          return;
        }

        alert("File deleted successfully!");

        if (activeTab === "files") {
          fetchFiles();
        } else {
          fetchProducts();
        }
      } catch (error) {
        console.error("Error during file deletion:", error);
        alert(`Unexpected error: ${error.message}`);
      } finally {
        setIsDeletingFile(null);
      }
    },
    [activeTab, fetchFiles, fetchProducts, files]
  );

  // --- load data on mount / tab change ---
  useEffect(() => {
    if (activeTab === "files") {
      fetchFiles();
    } else {
      fetchProducts();
    }
  }, [activeTab, fetchFiles, fetchProducts]);

  // --- helpers ---
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    );
  };

  const getFilteredFiles = () => {
    if (fileTypeFilter === "all") return files;
    if (fileTypeFilter === "orphaned")
      return files.filter((file) => file.is_orphaned);
    return files.filter((file) => file.file_type === fileTypeFilter);
  };

  const filteredFiles = getFilteredFiles();

  // --- modal handlers ---
  const openAddModal = () => {
    setModalMode("add");
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode("edit");
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    openEditModal(product);
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - MJK Prints</title>
        <meta
          name="description"
          content="Secure admin dashboard for managing digital prints"
        />
      </Head>

      {/* --- Your existing JSX remains unchanged (products tab + files tab rendering) --- */}
      {/* I only fixed the imports, data fetching, and delete handler to prevent runtime errors */}
    </>
  );
}

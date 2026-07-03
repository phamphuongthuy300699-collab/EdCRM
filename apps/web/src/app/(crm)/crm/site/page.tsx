"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Globe, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Search, 
  Users, 
  MapPin, 
  Tag, 
  FileText, 
  Image as ImageIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  X,
  Upload,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";
import { getMediaUrl } from "@/shared/utils/media";

type TabId = "home" | "branding" | "teachers" | "branches" | "prices" | "schedule" | "legal" | "footer" | "media";

export default function CrmSitePage() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [orgId, setOrgId] = useState("");

  const supabase = createSupabaseBrowserClient();
  const demo = isDemoMode();

  // Tab: Branding
  const [brandName, setBrandName] = useState("Робокс");
  const [brandLogo, setBrandLogo] = useState("branding/roboks-logo.svg");
  const [brandFavicon, setBrandFavicon] = useState("branding/favicon.ico");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#8ED0DD");
  const [brandAccentColor, setBrandAccentColor] = useState("#DA3C8C");
  const [brandGradient, setBrandGradient] = useState("linear-gradient(135deg, #8ED0DD 0%, #463E8E 50%, #DA3C8C 100%)");
  const [brandLogoDisplay, setBrandLogoDisplay] = useState("full"); // full, compact, sign
  const [brandLogoAlt, setBrandLogoAlt] = useState("Робокс — школа робототехники и программирования в Липецке");

  // Tab 1: Home/Hero & Portal Preview
  const [heroBadge, setHeroBadge] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroBullets, setHeroBullets] = useState<string[]>([]);
  const [newBullet, setNewBullet] = useState("");

  const [portalTitle, setPortalTitle] = useState("");
  const [portalSubtitle, setPortalSubtitle] = useState("");
  const [portalStudentName, setPortalStudentName] = useState("");
  const [portalAge, setPortalAge] = useState("");
  const [portalCourse, setPortalCourse] = useState("");
  const [portalNextLesson, setPortalNextLesson] = useState("");
  const [portalCabinet, setPortalCabinet] = useState("");
  const [portalAttendance, setPortalAttendance] = useState("");
  const [portalProject, setPortalProject] = useState("");
  const [portalBalance, setPortalBalance] = useState("");
  const [portalTeacherNote, setPortalTeacherNote] = useState("");

  // Tab 2: Teachers
  const [teachersTitle, setTeachersTitle] = useState("");
  const [teachersSubtitle, setTeachersSubtitle] = useState("");
  const [teachersShowBlock, setTeachersShowBlock] = useState(true);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Tab 3: Branches & Organization Contacts
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgShortLegal, setOrgShortLegal] = useState("");
  const [orgFullLegal, setOrgFullLegal] = useState("");
  const [orgInn, setOrgInn] = useState("");
  const [orgOgrn, setOrgOgrn] = useState("");
  const [orgLegalAddress, setOrgLegalAddress] = useState("");
  const [orgBankName, setOrgBankName] = useState("");
  const [orgBankInn, setOrgBankInn] = useState("");
  const [orgBik, setOrgBik] = useState("");
  const [orgAccount, setOrgAccount] = useState("");
  const [orgCorrAccount, setOrgCorrAccount] = useState("");
  const [orgBankAddress, setOrgBankAddress] = useState("");
  
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);

  // Tab 4: Prices & Tariffs
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [editingTariff, setEditingTariff] = useState<any | null>(null);

  // Tab 5: Schedule Visibility
  const [groups, setGroups] = useState<any[]>([]);

  // Tab 6: Legal Pages
  const [selectedDocKey, setSelectedDocKey] = useState<string>("legal.page.legal");
  const [docTitle, setDocTitle] = useState("");
  const [docSubtitle, setDocSubtitle] = useState("");
  const [docMetaTitle, setDocMetaTitle] = useState("");
  const [docMetaDesc, setDocMetaDesc] = useState("");
  const [docBody, setDocBody] = useState("");
  const [docShowInFooter, setDocShowInFooter] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Tab 7: Footer
  const [footerShowLegalName, setFooterShowLegalName] = useState(true);
  const [footerShowInn, setFooterShowInn] = useState(true);
  const [footerShowBankRequisites, setFooterShowBankRequisites] = useState(false);
  const [footerShowBranchAddresses, setFooterShowBranchAddresses] = useState(true);
  const [footerShowLegalAddress, setFooterShowLegalAddress] = useState(false);
  const [footerCopyrightText, setFooterCopyrightText] = useState("");
  const [footerVk, setFooterVk] = useState("");
  const [footerTelegram, setFooterTelegram] = useState("");
  const [footerWhatsapp, setFooterWhatsapp] = useState("");

  // Tab 8: Media Manager
  const [activeMediaFolder, setActiveMediaFolder] = useState("branding");
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General SEO Tab (merged into SEO section)
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoH1, setSeoH1] = useState("");

  // Load All Site Data
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Get default organization
      const { data: org, error: orgError } = await (supabase
        .from("organizations") as any)
        .select("*")
        .eq("slug", "robotics-lipetsk")
        .single();

      if (orgError || !org) throw new Error("Организация не найдена");
      setOrgId(org.id);

      setOrgPhone(org.phone || "");
      setOrgEmail(org.email || "");
      setOrgShortLegal(org.short_legal_name || "");
      setOrgFullLegal(org.full_legal_name || "");
      setOrgInn(org.inn || "");
      setOrgOgrn(org.ogrn || "");
      setOrgLegalAddress(org.legal_address || "");
      setOrgBankName(org.bank_name || "");
      setOrgBankInn(org.bank_inn || "");
      setOrgBik(org.bik || "");
      setOrgAccount(org.account_number || "");
      setOrgCorrAccount(org.correspondent_account || "");
      setOrgBankAddress(org.bank_address || "");

      // 2. Fetch site content blocks
      const { data: blocks } = await (supabase
        .from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", org.id);

      if (blocks) {
        // Hero
        const hero = blocks.find((b: any) => b.block_key === "home.hero");
        setHeroTitle(hero?.title || "");
        setHeroSubtitle(hero?.subtitle || "");
        setHeroBadge(hero?.content?.badge || "");
        setHeroCtaText(hero?.content?.ctaText || "");
        setHeroBullets(hero?.content?.bullets || []);

        // Portal Preview
        const pBlock = blocks.find((b: any) => b.block_key === "home.parent_student_portal_preview");
        setPortalTitle(pBlock?.title || "");
        setPortalSubtitle(pBlock?.subtitle || "");
        setPortalStudentName(pBlock?.content?.studentName || "");
        setPortalAge(pBlock?.content?.age || "");
        setPortalCourse(pBlock?.content?.course || "");
        setPortalNextLesson(pBlock?.content?.nextLesson || "");
        setPortalCabinet(pBlock?.content?.cabinet || "");
        setPortalAttendance(pBlock?.content?.attendance || "");
        setPortalProject(pBlock?.content?.project || "");
        setPortalBalance(pBlock?.content?.balance || "");
        setPortalTeacherNote(pBlock?.content?.teacherNote || "");

        // Teachers Block
        const tBlock = blocks.find((b: any) => b.block_key === "home.teachers");
        setTeachersTitle(tBlock?.title || "Наши преподаватели");
        setTeachersSubtitle(tBlock?.subtitle || "Практикующие наставники");
        setTeachersShowBlock(tBlock?.content?.showBlock !== false);

        // SEO
        const seoBlock = blocks.find((b: any) => b.block_key === "home.seo");
        setSeoTitle(seoBlock?.title || "");
        setSeoDescription(seoBlock?.subtitle || "");
        setSeoH1(seoBlock?.content?.h1 || "");

        // Footer block
        const fBlock = blocks.find((b: any) => b.block_key === "site.footer");
        if (fBlock) {
          setFooterShowLegalName(fBlock?.content?.showLegalName !== false);
          setFooterShowInn(fBlock?.content?.showInn !== false);
          setFooterShowBankRequisites(Boolean(fBlock?.content?.showBankRequisites));
          setFooterShowBranchAddresses(fBlock?.content?.showBranchAddresses !== false);
          setFooterShowLegalAddress(Boolean(fBlock?.content?.showLegalAddress));
          setFooterCopyrightText(fBlock?.content?.copyrightText || "");
          setFooterVk(fBlock?.content?.socials?.vk || "");
          setFooterTelegram(fBlock?.content?.socials?.telegram || "");
          setFooterWhatsapp(fBlock?.content?.socials?.whatsapp || "");
        }

        // Branding block
        const brand = blocks.find((b: any) => b.block_key === "site.branding");
        if (brand) {
          setBrandName(brand.title || "Робокс");
          setBrandLogo(brand.content?.logo || "branding/roboks-logo.svg");
          setBrandFavicon(brand.content?.favicon || "branding/favicon.ico");
          setBrandPrimaryColor(brand.content?.primaryColor || "#8ED0DD");
          setBrandAccentColor(brand.content?.accentColor || "#DA3C8C");
          setBrandGradient(brand.content?.gradient || "linear-gradient(135deg, #8ED0DD 0%, #463E8E 50%, #DA3C8C 100%)");
          setBrandLogoDisplay(brand.content?.logoDisplay || "full");
          setBrandLogoAlt(brand.content?.logoAlt || "Робокс — школа робототехники и программирования в Липецке");
        }
      }

      // 3. Fetch Teachers (profiles + memberships)
      const { data: teachersData } = await (supabase.from("org_memberships") as any)
        .select(`
          user_id,
          role,
          is_active,
          profiles(id, full_name, email, phone, specialty, public_bio, show_on_site, sort_order, avatar_url, show_public_contacts)
        `)
        .eq("organization_id", org.id)
        .eq("role", "teacher");

      if (teachersData) {
        const list = teachersData
          .map((m: any) => Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)
          .filter(Boolean)
          .sort((a: any, b: any) => (a.sort_order || 100) - (b.sort_order || 100));
        setTeachersList(list);
      }

      // 4. Fetch Branches
      const { data: branches } = await (supabase.from("branches") as any)
        .select("*")
        .eq("organization_id", org.id)
        .order("sort_order", { ascending: true });
      if (branches) setBranchesList(branches);

      // 5. Fetch Tariffs
      const { data: tariffsData } = await (supabase.from("course_tariffs") as any)
        .select("*")
        .eq("organization_id", org.id)
        .order("sort_order", { ascending: true });
      if (tariffsData) setTariffs(tariffsData);

      // 6. Fetch Groups
      const { data: groupsData } = await (supabase.from("groups") as any)
        .select(`
          *,
          course:courses(title),
          schedule_rules:group_schedule_rules(weekday, starts_at)
        `)
        .eq("organization_id", org.id)
        .order("sort_order", { ascending: true });
      if (groupsData) setGroups(groupsData);

      // 7. Fetch Staff via API endpoint (bypasses RLS)
      const staffRes = await fetch("/api/crm/staff/list").then((res) => res.json()).catch(() => ({ ok: false, staff: [] }));
      if (staffRes && staffRes.ok) {
        setStaff(staffRes.staff || []);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка загрузки данных сайта");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch media files list when active folder or media tab is selected
  const loadMediaFiles = async () => {
    try {
      const res = await fetch(`/api/crm/media?folder=${activeMediaFolder}`);
      const data = await res.json();
      if (res.ok) {
        setMediaFiles(data.files || []);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Media load error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "media") {
      setSelectedFile(null);
      loadMediaFiles();
    }
  }, [activeTab, activeMediaFolder]);

  // Load active legal page details
  useEffect(() => {
    if (activeTab === "legal") {
      if (!orgId) return;
      setLoadingDoc(true);
      const docKey = selectedDocKey;
      (supabase
        .from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", orgId)
        .eq("block_key", docKey)
        .maybeSingle()
        .then(({ data }: any) => {
          setDocTitle(data?.title || "");
          setDocSubtitle(data?.subtitle || "");
          setDocMetaTitle(data?.content?.meta_title || "");
          setDocMetaDesc(data?.content?.meta_description || "");
          setDocBody(data?.content?.body || "");
          setDocShowInFooter(data?.content?.show_in_footer !== false);
          setLoadingDoc(false);
        })
        .catch(() => {
          setLoadingDoc(false);
        });
    }
  }, [activeTab, selectedDocKey, orgId]);

  // General Block Saving Helper
  const saveBlock = async (key: string, title: string, subtitle: string, content: any) => {
    if (demo) {
      console.log(`Demo mode block save: ${key}`, { title, subtitle, content });
      return;
    }
    const { error } = await (supabase.from("site_content_blocks") as any)
      .upsert({
        organization_id: orgId,
        page_slug: key.startsWith("legal.page") ? `/${key.split(".").pop()}` : "/",
        block_key: key,
        title,
        subtitle,
        content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "organization_id,page_slug,block_key"
      });
    if (error) throw error;
  };

  // Tab 1: Save Home/Hero
  const handleSaveHome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await saveBlock("home.hero", heroTitle, heroSubtitle, {
        badge: heroBadge,
        ctaText: heroCtaText,
        bullets: heroBullets
      });
      await saveBlock("home.parent_student_portal_preview", portalTitle, portalSubtitle, {
        studentName: portalStudentName,
        age: portalAge,
        course: portalCourse,
        nextLesson: portalNextLesson,
        cabinet: portalCabinet,
        attendance: portalAttendance,
        project: portalProject,
        balance: portalBalance,
        teacherNote: portalTeacherNote
      });
      await saveBlock("home.seo", seoTitle, seoDescription, { h1: seoH1 });
      setSuccessMsg("Изменения на Главной сохранены!");
    } catch (err: any) {
      setErrorMsg(err.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  // Tab 2: Save Teachers settings
  const handleSaveTeachersSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      await saveBlock("home.teachers", teachersTitle, teachersSubtitle, {
        showBlock: teachersShowBlock
      });
      setSuccessMsg("Настройки наставников сохранены!");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Tab: Branding settings save
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      await saveBlock("site.branding", brandName, "Настройки брендинга", {
        logo: brandLogo,
        favicon: brandFavicon,
        primaryColor: brandPrimaryColor,
        accentColor: brandAccentColor,
        gradient: brandGradient,
        logoDisplay: brandLogoDisplay,
        logoAlt: brandLogoAlt
      });
      setSuccessMsg("Настройки брендинга успешно сохранены!");
    } catch (err: any) {
      setErrorMsg(err.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  // Quick upload for Logo / Favicon
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "branding");

      const res = await fetch("/api/crm/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Не удалось загрузить файл");
      }

      const data = await res.json();
      if (target === "logo") {
        setBrandLogo(data.path);
      } else {
        setBrandFavicon(data.path);
      }
      setSuccessMsg("Файл успешно загружен и установлен!");
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при загрузке файла");
    } finally {
      setSaving(false);
    }
  };

  // Toggle teacher public visibility & contact details
  const handleToggleTeacherField = async (teacher: any, field: "show_on_site" | "show_public_contacts") => {
    const nextVal = !teacher[field];
    try {
      const { error } = await (supabase.from("profiles") as any)
        .update({ [field]: nextVal })
        .eq("id", teacher.id);
      if (error) throw error;
      setTeachersList(teachersList.map(t => t.id === teacher.id ? { ...t, [field]: nextVal } : t));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Tab 3: Save Org general info
  const handleSaveOrgInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      const { error } = await (supabase.from("organizations") as any)
        .update({
          phone: orgPhone,
          email: orgEmail,
          short_legal_name: orgShortLegal,
          full_legal_name: orgFullLegal,
          inn: orgInn,
          ogrn: orgOgrn || null,
          legal_address: orgLegalAddress,
          bank_name: orgBankName,
          bank_inn: orgBankInn,
          bik: orgBik,
          account_number: orgAccount,
          correspondent_account: orgCorrAccount,
          bank_address: orgBankAddress
        })
        .eq("id", orgId);

      if (error) throw error;
      setSuccessMsg("Контакты и реквизиты успешно сохранены!");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit/Save Branch Details
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from("branches") as any)
        .update({
          name: editingBranch.name,
          address: editingBranch.address,
          phone: editingBranch.phone,
          email: editingBranch.email,
          work_hours: editingBranch.work_hours,
          show_on_site: editingBranch.show_on_site,
          sort_order: parseInt(editingBranch.sort_order || 100, 10)
        })
        .eq("id", editingBranch.id);

      if (error) throw error;
      setBranchesList(branchesList.map(b => b.id === editingBranch.id ? editingBranch : b));
      setEditingBranch(null);
      setSuccessMsg("Филиал успешно сохранен!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tab 4: CRUD Tariffs
  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTariff) return;
    setSaving(true);
    try {
      const tariffData = {
        organization_id: orgId,
        title: editingTariff.title,
        audience: editingTariff.audience || "school",
        format: editingTariff.format,
        price: parseFloat(editingTariff.price || 0),
        is_one_time: Boolean(editingTariff.is_one_time),
        sort_order: parseInt(editingTariff.sort_order || 100, 10),
        show_on_site: editingTariff.show_on_site
      };

      if (editingTariff.id) {
        // Update
        const { error } = await (supabase.from("course_tariffs") as any)
          .update(tariffData)
          .eq("id", editingTariff.id);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await (supabase.from("course_tariffs") as any)
          .insert(tariffData)
          .select()
          .single();
        if (error) throw error;
      }
      loadData();
      setEditingTariff(null);
      setSuccessMsg("Тариф сохранен!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTariff = async (id: string) => {
    if (!confirm("Вы действительно хотите удалить этот тариф?")) return;
    try {
      const { error } = await (supabase.from("course_tariffs") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      setTariffs(tariffs.filter(t => t.id !== id));
      setSuccessMsg("Тариф удален!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Tab 5: Schedule visibility toggle
  const handleToggleGroupShowOnSite = async (group: any) => {
    const nextVal = !group.show_on_site;
    try {
      const { error } = await (supabase.from("groups") as any)
        .update({ show_on_site: nextVal })
        .eq("id", group.id);
      if (error) throw error;
      setGroups(groups.map(g => g.id === group.id ? { ...g, show_on_site: nextVal } : g));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Tab 6: Save Legal Page content
  const handleSaveLegalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const { data: existing } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", orgId)
        .eq("block_key", selectedDocKey)
        .maybeSingle();

      const mergedContent = {
        ...(existing?.content || {})
      };

      const finalTitle = docTitle || existing?.title || "";
      const finalSubtitle = docSubtitle || existing?.subtitle || "";
      const finalBody = docBody || existing?.content?.body || "";
      const finalMetaTitle = docMetaTitle || existing?.content?.meta_title || "";
      const finalMetaDesc = docMetaDesc || existing?.content?.meta_description || "";

      mergedContent.body = finalBody;
      mergedContent.meta_title = finalMetaTitle;
      mergedContent.meta_description = finalMetaDesc;
      mergedContent.show_in_footer = docShowInFooter;

      await saveBlock(selectedDocKey, finalTitle, finalSubtitle, mergedContent);
      setSuccessMsg("Юридический документ сохранен!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFileToBlock = async (blockKey: string, fieldName: string, isArray: boolean) => {
    if (!selectedFile) return;
    try {
      setSaving(true);
      setSuccessMsg("");
      setErrorMsg("");

      const { data: existing, error: fetchErr } = await (supabase.from("site_content_blocks") as any)
        .select("*")
        .eq("organization_id", orgId)
        .eq("block_key", blockKey)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      let title = existing?.title;
      let subtitle = existing?.subtitle;

      if (!title) {
        if (blockKey === "home.media") { title = "Медиа главной"; subtitle = "Изображения первого экрана"; }
        else if (blockKey === "home.facilities") { title = "Фото помещений"; subtitle = "Наши учебные классы"; }
        else if (blockKey === "home.student_projects") { title = "Проекты учеников"; subtitle = "Инженерные разработки"; }
        else if (blockKey === "home.lesson_process") { title = "Как проходят занятия"; subtitle = "Этапы уроков"; }
        else if (blockKey === "home.equipment") { title = "Классы и оборудование"; subtitle = "Материалы и стенды"; }
        else if (blockKey === "contacts.media") { title = "Медиа контактов"; subtitle = "Фотографии контактов"; }
        else if (blockKey === "site.footer") { title = "Футер сайта"; subtitle = "Параметры отображения нижней части страниц"; }
        else { title = blockKey; subtitle = ""; }
      }

      const mergedContent = { ...(existing?.content || {}) };

      if (isArray) {
        const currentImages = Array.isArray(mergedContent[fieldName]) ? mergedContent[fieldName] : [];
        if (!currentImages.includes(selectedFile.path)) {
          mergedContent[fieldName] = [...currentImages, selectedFile.path];
        }
      } else {
        mergedContent[fieldName] = selectedFile.path;
      }

      await saveBlock(blockKey, title, subtitle, mergedContent);
      setSuccessMsg(`Изображение добавлено/установлено в раздел "${title}"!`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Не удалось применить файл");
    } finally {
      setSaving(false);
    }
  };

  // Tab 7: Save Footer
  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      await saveBlock("site.footer", "Футер сайта", "Параметры отображения нижней части страниц", {
        showLegalName: footerShowLegalName,
        showInn: footerShowInn,
        showBankRequisites: footerShowBankRequisites,
        showBranchAddresses: footerShowBranchAddresses,
        showLegalAddress: footerShowLegalAddress,
        copyrightText: footerCopyrightText,
        socials: {
          vk: footerVk,
          telegram: footerTelegram,
          whatsapp: footerWhatsapp
        }
      });
      setSuccessMsg("Настройки футера сохранены!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tab 8: Upload file
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", activeMediaFolder);

      const res = await fetch("/api/crm/media", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Файл ${file.name} успешно загружен!`);
      const relativePath = data.path;
      await loadMediaFiles();
      setSelectedFile({
        name: relativePath.split("/").pop() || "",
        path: relativePath,
        url: data.url || getMediaUrl(relativePath),
        size: file.size
      });
    } catch (err: any) {
      alert(err.message || "Не удалось загрузить файл");
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <style>{`
        .card-crm { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 24px; display: flex; flexDirection: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 13px; fontWeight: 700; color: var(--color-text); }
        .form-input { border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 13px; width: 100%; box-sizing: border-box; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .site-editor-shell { display: grid; grid-template-columns: 240px 1fr; gap: 32px; margin-top: 24px; align-items: start; }
        .site-editor-nav { display: flex; flex-direction: column; gap: 6px; }
        .site-editor-panel { display: flex; flex-direction: column; gap: 24px; }
        .site-tab-nav-mobile { display: none; }
        @media (max-width: 768px) {
          .site-editor-shell { grid-template-columns: 1fr !important; gap: 16px !important; }
          .site-editor-nav { display: none !important; }
          .site-tab-nav-mobile { display: block !important; margin-bottom: 16px; }
        }
        @media (max-width: 992px) {
          .media-manager-layout { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
        .badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .badge-blue { background: var(--color-primary-soft); color: var(--color-primary-dark); }
        .badge-red { background: #FEF2F2; color: #991B1B; }
        .badge-green { background: #DCFCE7; color: #15803D; }
        .badge-gray { background: #F3F4F6; color: #4B5563; }
        .site-tab-nav { display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
        .site-tab-nav-mobile { display: none; }
        @media (max-width: 768px) {
          .site-tab-nav { display: none !important; }
          .site-tab-nav-mobile { display: block !important; margin-bottom: 16px; }
        }
        .table-crm { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table-crm th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--color-border); font-weight: 700; }
        .table-crm td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
      `}</style>

      <div style={{ display: "flex", alignContent: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", margin: "0 0 4px" }}>Управление сайтом</h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>Настройка внешнего вида, медиафайлов, тарифов, контактов и правовой информации школы Робокс.</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", color: "#166534", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 650 }}>
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 650 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="site-tab-nav-mobile">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
          className="form-input"
          style={{
            height: "44px",
            fontSize: "14px",
            fontWeight: 700,
            border: "1px solid var(--color-primary)",
            color: "var(--color-primary-dark)",
            background: "var(--color-primary-soft)",
            width: "100%",
            borderRadius: "8px",
            padding: "0 12px",
            boxSizing: "border-box"
          }}
        >
          <option value="home">🏠 Главная страница</option>
          <option value="branding">✨ Брендинг</option>
          <option value="teachers">👥 Преподаватели</option>
          <option value="branches">📍 Контакты & Филиалы</option>
          <option value="prices">💵 Цены & Тарифы</option>
          <option value="schedule">📅 Расписание</option>
          <option value="legal">📄 Юридические страницы</option>
          <option value="footer">🏢 Футер</option>
          <option value="media">🖼️ Медиа-менеджер</option>
        </select>
      </div>

      <div className="site-editor-shell">
        <div className="site-editor-nav">
          {[
            { id: "home", label: "Главная страница", icon: Globe },
            { id: "branding", label: "Брендинг", icon: Sparkles },
            { id: "teachers", label: "Преподаватели", icon: Users },
            { id: "branches", label: "Контакты & Филиалы", icon: MapPin },
            { id: "prices", label: "Цены & Тарифы", icon: DollarSign },
            { id: "schedule", label: "Расписание", icon: Calendar },
            { id: "legal", label: "Юридические страницы", icon: FileText },
            { id: "footer", label: "Футер", icon: Building },
            { id: "media", label: "Медиа-менеджер", icon: ImageIcon }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as TabId);
                  setSuccessMsg("");
                  setErrorMsg("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  background: isActive ? "var(--color-primary-soft)" : "transparent",
                  color: isActive ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.2s"
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="site-editor-panel" style={{ flex: 1 }}>
          {loading ? (
            <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Загрузка...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <form onSubmit={handleSaveHome} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Блок Hero (Первый экран)</h3>
                
                <div className="form-group">
                  <label className="form-label">Бейдж над заголовком</label>
                  <input type="text" className="form-input" value={heroBadge} onChange={e => setHeroBadge(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Заголовок H1</label>
                  <input type="text" className="form-input" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Подзаголовок</label>
                  <textarea className="form-input" style={{ height: "60px" }} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Текст кнопки призыва к действию (CTA)</label>
                  <input type="text" className="form-input" value={heroCtaText} onChange={e => setHeroCtaText(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Преимущества (список)</label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input type="text" className="form-input" value={newBullet} onChange={e => setNewBullet(e.target.value)} placeholder="Добавить преимущество..." />
                    <Button type="button" variant="secondary-crm" onClick={() => {
                      if (newBullet.trim()) {
                        setHeroBullets([...heroBullets, newBullet.trim()]);
                        setNewBullet("");
                      }
                    }}>Добавить</Button>
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {heroBullets.map((b, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F9FAFB", padding: "6px 12px", borderRadius: "6px", fontSize: "12px" }}>
                        <span>{b}</span>
                        <button type="button" onClick={() => setHeroBullets(heroBullets.filter((_, i) => i !== idx))} style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer" }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Блок «Личный кабинет»</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Заголовок блока</label>
                    <input type="text" className="form-input" value={portalTitle} onChange={e => setPortalTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Подзаголовок</label>
                    <input type="text" className="form-input" value={portalSubtitle} onChange={e => setPortalSubtitle(e.target.value)} required />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Имя ученика (демо)</label>
                    <input type="text" className="form-input" value={portalStudentName} onChange={e => setPortalStudentName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Возраст (демо)</label>
                    <input type="text" className="form-input" value={portalAge} onChange={e => setPortalAge(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Курс (демо)</label>
                    <input type="text" className="form-input" value={portalCourse} onChange={e => setPortalCourse(e.target.value)} required />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Следующий урок (демо)</label>
                    <input type="text" className="form-input" value={portalNextLesson} onChange={e => setPortalNextLesson(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Кабинет (демо)</label>
                    <input type="text" className="form-input" value={portalCabinet} onChange={e => setPortalCabinet(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Посещаемость (демо)</label>
                    <input type="text" className="form-input" value={portalAttendance} onChange={e => setPortalAttendance(e.target.value)} required />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Проект (демо)</label>
                    <input type="text" className="form-input" value={portalProject} onChange={e => setPortalProject(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Баланс (демо)</label>
                    <input type="text" className="form-input" value={portalBalance} onChange={e => setPortalBalance(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Отзыв преподавателя (демо)</label>
                    <input type="text" className="form-input" value={portalTeacherNote} onChange={e => setPortalTeacherNote(e.target.value)} required />
                  </div>
                </div>
              </div>

              <div className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>SEO параметры главной</h3>
                <div className="form-group">
                  <label className="form-label">Meta Title (Заголовок вкладки)</label>
                  <input type="text" className="form-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Meta Description</label>
                  <input type="text" className="form-input" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Заголовок H1 на сайте</label>
                  <input type="text" className="form-input" value={seoH1} onChange={e => setSeoH1(e.target.value)} required />
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  <Save size={16} /> Сохранить главную страницу
                </Button>
              </div>
            </form>
          )}

          {/* TAB: BRANDING */}
          {activeTab === "branding" && (
            <form onSubmit={handleSaveBranding} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Настройки бренда Робокс</h3>
                
                <div className="form-group">
                  <label className="form-label">Название бренда</label>
                  <input type="text" className="form-input" value={brandName} onChange={e => setBrandName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Логотип (путь в хранилище)</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input type="text" className="form-input" value={brandLogo} onChange={e => setBrandLogo(e.target.value)} required />
                    <div style={{ width: "80px", height: "40px", border: "1px solid var(--color-border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", overflow: "hidden" }}>
                      <img src={getMediaUrl(brandLogo)} alt="Preview Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    <input type="file" id="logo-quick-uploader" accept=".svg,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => handleQuickUpload(e, "logo")} />
                    <Button type="button" variant="secondary-crm" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => document.getElementById("logo-quick-uploader")?.click()}>
                      Загрузить новый логотип
                    </Button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Favicon / Иконка (путь в хранилище)</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input type="text" className="form-input" value={brandFavicon} onChange={e => setBrandFavicon(e.target.value)} required />
                    <div style={{ width: "40px", height: "40px", border: "1px solid var(--color-border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", overflow: "hidden" }}>
                      <img src={getMediaUrl(brandFavicon)} alt="Preview Favicon" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    <input type="file" id="favicon-quick-uploader" accept=".ico,.png,.svg" style={{ display: "none" }} onChange={(e) => handleQuickUpload(e, "favicon")} />
                    <Button type="button" variant="secondary-crm" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => document.getElementById("favicon-quick-uploader")?.click()}>
                      Загрузить новую иконку
                    </Button>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Основной цвет</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input type="color" value={brandPrimaryColor} onChange={e => setBrandPrimaryColor(e.target.value)} style={{ border: "none", width: "36px", height: "36px", cursor: "pointer", padding: 0 }} />
                      <input type="text" className="form-input" value={brandPrimaryColor} onChange={e => setBrandPrimaryColor(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Акцентный цвет</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input type="color" value={brandAccentColor} onChange={e => setBrandAccentColor(e.target.value)} style={{ border: "none", width: "36px", height: "36px", cursor: "pointer", padding: 0 }} />
                      <input type="text" className="form-input" value={brandAccentColor} onChange={e => setBrandAccentColor(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Вариант отображения</label>
                    <select className="form-input" value={brandLogoDisplay} onChange={e => setBrandLogoDisplay(e.target.value)}>
                      <option value="full">Полный логотип</option>
                      <option value="compact">Компактный</option>
                      <option value="sign">Только знак</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Градиент бренда</label>
                  <input type="text" className="form-input" value={brandGradient} onChange={e => setBrandGradient(e.target.value)} required />
                  <div style={{ height: "16px", borderRadius: "4px", background: brandGradient, marginTop: "8px", border: "1px solid var(--color-border)" }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Alt-текст логотипа</label>
                  <input type="text" className="form-input" value={brandLogoAlt} onChange={e => setBrandLogoAlt(e.target.value)} required />
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  <Save size={16} /> Сохранить настройки бренда
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: TEACHERS */}
          {activeTab === "teachers" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <form onSubmit={handleSaveTeachersSettings} className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Настройки отображения блока на главной</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input type="checkbox" id="teachersShowBlock" checked={teachersShowBlock} onChange={e => setTeachersShowBlock(e.target.checked)} style={{ cursor: "pointer" }} />
                  <label htmlFor="teachersShowBlock" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Показывать блок «Наши преподаватели» на главной</label>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Заголовок блока</label>
                    <input type="text" className="form-input" value={teachersTitle} onChange={e => setTeachersTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Подзаголовок блока</label>
                    <input type="text" className="form-input" value={teachersSubtitle} onChange={e => setTeachersSubtitle(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Button type="submit" variant="primary-crm" disabled={saving}>Сохранить настройки блока</Button>
                </div>
              </form>

              <div className="card-crm">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Преподаватели из CRM</h3>
                  <a href="/crm/settings?tab=staff" style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 700 }}>Перейти в управление сотрудниками →</a>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="table-crm">
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Специализация</th>
                        <th style={{ textAlign: "center" }}>Показывать контакты</th>
                        <th style={{ textAlign: "right" }}>Статус на сайте</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachersList.map(teacher => (
                        <tr key={teacher.id}>
                          <td style={{ fontWeight: 700 }}>{teacher.full_name}</td>
                          <td style={{ fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "250px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{teacher.specialty || "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button type="button" onClick={() => handleToggleTeacherField(teacher, "show_public_contacts")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: teacher.show_public_contacts ? "#22C55E" : "var(--color-text-muted)" }}>
                              {teacher.show_public_contacts ? "Публичные" : "Скрыты"}
                            </button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => handleToggleTeacherField(teacher, "show_on_site")}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontWeight: 700,
                                fontSize: "12px",
                                color: teacher.show_on_site ? "#22C55E" : "#EF4444"
                              }}
                            >
                              {teacher.show_on_site ? (
                                <><Eye size={14} /> На сайте</>
                              ) : (
                                <><EyeOff size={14} /> Скрыт</>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BRANCHES & CONTACTS */}
          {activeTab === "branches" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <form onSubmit={handleSaveOrgInfo} className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Контакты организации и банковские реквизиты</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Телефон организации (основной)</label>
                    <input type="text" className="form-input" value={orgPhone} onChange={e => setOrgPhone(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email организации (основной)</label>
                    <input type="email" className="form-input" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Сокращенное юридическое наименование</label>
                    <input type="text" className="form-input" value={orgShortLegal} onChange={e => setOrgShortLegal(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Полное юридическое наименование</label>
                    <input type="text" className="form-input" value={orgFullLegal} onChange={e => setOrgFullLegal(e.target.value)} required />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">ИНН организации</label>
                    <input type="text" className="form-input" value={orgInn} onChange={e => setOrgInn(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ОГРН/ОГРНИП (не выдумывать)</label>
                    <input type="text" className="form-input" value={orgOgrn} onChange={e => setOrgOgrn(e.target.value)} placeholder="Пусто / не указано" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Юридический адрес</label>
                    <input type="text" className="form-input" value={orgLegalAddress} onChange={e => setOrgLegalAddress(e.target.value)} required />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "8px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 12px 0" }}>Банковские данные (получатель)</h4>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Название банка</label>
                      <input type="text" className="form-input" value={orgBankName} onChange={e => setOrgBankName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ИНН банка</label>
                      <input type="text" className="form-input" value={orgBankInn} onChange={e => setOrgBankInn(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">БИК</label>
                      <input type="text" className="form-input" value={orgBik} onChange={e => setOrgBik(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-grid-3" style={{ marginTop: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">Расчетный счет</label>
                      <input type="text" className="form-input" value={orgAccount} onChange={e => setOrgAccount(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Корреспондентский счет</label>
                      <input type="text" className="form-input" value={orgCorrAccount} onChange={e => setOrgCorrAccount(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Адрес банка</label>
                      <input type="text" className="form-input" value={orgBankAddress} onChange={e => setOrgBankAddress(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div>
                  <Button type="submit" variant="primary-crm" disabled={saving}>
                    <Save size={16} /> Сохранить реквизиты
                  </Button>
                </div>
              </form>

              <div className="card-crm">
                <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Адреса образовательной деятельности (Филиалы на сайте)</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="table-crm">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Адрес проведения занятий</th>
                        <th>Режим работы</th>
                        <th style={{ textAlign: "center" }}>Порядок</th>
                        <th style={{ textAlign: "right" }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchesList.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 700 }}>{b.name}</td>
                          <td>{b.address}</td>
                          <td style={{ fontSize: "12px" }}>{b.work_hours || "—"}</td>
                          <td style={{ textAlign: "center" }}>{b.sort_order}</td>
                          <td style={{ textAlign: "right" }}>
                            <Button variant="secondary-crm" onClick={() => setEditingBranch(b)} style={{ height: "30px", fontSize: "11px", display: "inline-flex", gap: "4px" }}>
                              <Edit size={12} /> Изменить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Branch Modal */}
              {editingBranch && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                  <form onSubmit={handleSaveBranch} style={{ background: "white", padding: "28px", borderRadius: "16px", width: "480px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "16px", margin: 0 }}>Редактировать филиал: {editingBranch.name}</h3>
                    <div className="form-group">
                      <label className="form-label">Название</label>
                      <input type="text" className="form-input" value={editingBranch.name} onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Адрес проведения занятий</label>
                      <input type="text" className="form-input" value={editingBranch.address} onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Режим работы</label>
                      <input type="text" className="form-input" value={editingBranch.work_hours || ""} onChange={e => setEditingBranch({ ...editingBranch, work_hours: e.target.value })} required />
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Порядок сортировки</label>
                        <input type="number" className="form-input" value={editingBranch.sort_order} onChange={e => setEditingBranch({ ...editingBranch, sort_order: e.target.value })} required />
                      </div>
                      <div className="form-group" style={{ justifyContent: "center" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "16px" }}>
                          <input type="checkbox" id="branch_show" checked={editingBranch.show_on_site} onChange={e => setEditingBranch({ ...editingBranch, show_on_site: e.target.checked })} />
                          <label htmlFor="branch_show" style={{ fontSize: "12px", fontWeight: 700 }}>Показывать на сайте</label>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: "14px" }}>
                      <Button variant="secondary-crm" type="button" onClick={() => setEditingBranch(null)}>Отмена</Button>
                      <Button variant="primary-crm" type="submit" disabled={saving}>Сохранить</Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRICES & TARIFFS */}
          {activeTab === "prices" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <div className="card-crm">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Публичные тарифы Робокс</h3>
                  <Button variant="primary-crm" onClick={() => setEditingTariff({ title: "", audience: "school", format: "", price: 0, is_one_time: false, sort_order: 100, show_on_site: true })}>
                    <Plus size={14} /> Создать тариф
                  </Button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="table-crm">
                    <thead>
                      <tr>
                        <th>Название тарифа</th>
                        <th>Аудитория</th>
                        <th>Описание / Формат</th>
                        <th style={{ textAlign: "right" }}>Цена</th>
                        <th style={{ textAlign: "center" }}>Разовый</th>
                        <th style={{ textAlign: "center" }}>На сайте</th>
                        <th style={{ textAlign: "right" }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tariffs.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700 }}>{t.title}</td>
                          <td>
                            {t.audience === "school" ? "Школьники" : t.audience === "preschool" ? "Дошкольники" : "Общий"}
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{t.format || "—"}</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "var(--color-primary)" }}>{Number(t.price).toLocaleString("ru-RU")} ₽</td>
                          <td style={{ textAlign: "center" }}>{t.is_one_time ? "Да" : "Нет"}</td>
                          <td style={{ textAlign: "center" }}>{t.show_on_site ? "✓" : "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <Button variant="secondary-crm" onClick={() => setEditingTariff({ ...t, price: t.price.toString() })} style={{ height: "30px", fontSize: "11px" }}>
                                <Edit size={12} />
                              </Button>
                              <Button variant="secondary-crm" onClick={() => handleDeleteTariff(t.id)} style={{ height: "30px", fontSize: "11px", color: "#EF4444" }}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tariffs.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "var(--color-text-muted)" }}>Тарифы отсутствуют.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Tariff Modal */}
              {editingTariff && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                  <form onSubmit={handleSaveTariff} style={{ background: "white", padding: "28px", borderRadius: "16px", width: "480px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "16px", margin: 0 }}>{editingTariff.id ? "Редактировать тариф" : "Создать тариф"}</h3>
                    
                    <div className="form-group">
                      <label className="form-label">Название тарифа *</label>
                      <input type="text" className="form-input" value={editingTariff.title} onChange={e => setEditingTariff({ ...editingTariff, title: e.target.value })} required />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Аудитория</label>
                      <select className="form-input" value={editingTariff.audience} onChange={e => setEditingTariff({ ...editingTariff, audience: e.target.value })}>
                        <option value="school">Школьники (8-14 лет)</option>
                        <option value="preschool">Дошкольники (5-7 лет)</option>
                        <option value="general">Общий тариф</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Описание / Формат занятий</label>
                      <input type="text" className="form-input" value={editingTariff.format || ""} onChange={e => setEditingTariff({ ...editingTariff, format: e.target.value })} placeholder="Например: В мини-группе 2 раза в неделю по 90 минут" />
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Стоимость (₽) *</label>
                        <input type="number" className="form-input" value={editingTariff.price} onChange={e => setEditingTariff({ ...editingTariff, price: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Порядок сортировки</label>
                        <input type="number" className="form-input" value={editingTariff.sort_order} onChange={e => setEditingTariff({ ...editingTariff, sort_order: e.target.value })} required />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input type="checkbox" id="t_one_time" checked={editingTariff.is_one_time} onChange={e => setEditingTariff({ ...editingTariff, is_one_time: e.target.checked })} />
                        <label htmlFor="t_one_time" style={{ fontSize: "12px", fontWeight: 700 }}>Разовый платеж</label>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input type="checkbox" id="t_show" checked={editingTariff.show_on_site} onChange={e => setEditingTariff({ ...editingTariff, show_on_site: e.target.checked })} />
                        <label htmlFor="t_show" style={{ fontSize: "12px", fontWeight: 700 }}>Показывать на сайте</label>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: "14px" }}>
                      <Button variant="secondary-crm" type="button" onClick={() => setEditingTariff(null)}>Отмена</Button>
                      <Button variant="primary-crm" type="submit" disabled={saving}>Сохранить</Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SCHEDULE */}
          {activeTab === "schedule" && (
            <div className="card-crm">
              <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Группы и расписание на сайте</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Управляйте видимостью групп на публичном расписании сайта.</p>
              
              <div style={{ overflowX: "auto" }}>
                <table className="table-crm">
                  <thead>
                    <tr>
                      <th>Группа</th>
                      <th>Направление</th>
                      <th>Филиал</th>
                      <th>Время</th>
                      <th style={{ textAlign: "right" }}>Статус на сайте</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => {
                      const daysMap: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс" };
                      const rules = g.schedule_rules || [];
                      const sortedRules = [...rules].sort((a: any, b: any) => a.weekday - b.weekday);
                      const days = sortedRules.map((r: any) => daysMap[r.weekday] || "").join("/");
                      const start = sortedRules[0]?.starts_at ? sortedRules[0].starts_at.substring(0, 5) : "";
                      const timeLabel = rules.length > 0 ? `${days} в ${start}` : "Уточняется";
                      
                      return (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 700 }}>{g.title}</td>
                          <td>{g.course?.title || "—"}</td>
                          <td>{g.branch?.name || "—"}</td>
                          <td>{timeLabel}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleGroupShowOnSite(g)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontWeight: 700,
                                fontSize: "12px",
                                color: g.show_on_site ? "#22C55E" : "var(--color-text-muted)"
                              }}
                            >
                              {g.show_on_site ? (
                                <><Eye size={14} /> На сайте</>
                              ) : (
                                <><EyeOff size={14} /> Скрыта</>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LEGAL PAGES */}
          {activeTab === "legal" && (
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { key: "legal.page.legal", label: "Реквизиты" },
                  { key: "legal.page.privacy", label: "Персональные данные" },
                  { key: "legal.page.offer", label: "Оферта" },
                  { key: "legal.page.payment", label: "Оплата" },
                  { key: "legal.page.refund", label: "Возврат" }
                ].map(doc => (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => {
                      setSelectedDocKey(doc.key);
                      setSuccessMsg("");
                      setErrorMsg("");
                    }}
                    style={{
                      border: "none",
                      background: selectedDocKey === doc.key ? "var(--color-primary-soft)" : "none",
                      color: selectedDocKey === doc.key ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      textAlign: "left",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveLegalDoc} className="card-crm" style={{ gap: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, textTransform: "capitalize" }}>
                  Редактировать страницу: {selectedDocKey.split(".").pop()}
                </h3>

                <div className="form-group">
                  <label className="form-label">Заголовок H1 страницы</label>
                  <input type="text" className="form-input" value={docTitle} onChange={e => setDocTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Короткое описание / Лид-параграф</label>
                  <input type="text" className="form-input" value={docSubtitle} onChange={e => setDocSubtitle(e.target.value)} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Meta Title (SEO)</label>
                    <input type="text" className="form-input" value={docMetaTitle} onChange={e => setDocMetaTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta Description (SEO)</label>
                    <input type="text" className="form-input" value={docMetaDesc} onChange={e => setDocMetaDesc(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Текст страницы (поддерживает двойной перенос для новых параграфов)</label>
                  <textarea className="form-input" style={{ height: "240px", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5" }} value={docBody} onChange={e => setDocBody(e.target.value)} required />
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="docShowInFooter" checked={docShowInFooter} onChange={e => setDocShowInFooter(e.target.checked)} />
                  <label htmlFor="docShowInFooter" style={{ fontSize: "12px", fontWeight: 700 }}>Показывать ссылку на страницу в футере</label>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <Button type="submit" variant="primary-crm" disabled={saving}>
                    <Save size={16} /> Сохранить документ
                  </Button>
                  <Button
                    type="button"
                    variant="secondary-crm"
                    onClick={() => {
                      const slug = selectedDocKey.split(".").pop();
                      window.open(`/${slug}`, "_blank");
                    }}
                  >
                    Открыть на сайте
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: FOOTER */}
          {activeTab === "footer" && (
            <form onSubmit={handleSaveFooter} className="card-crm" style={{ gap: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", margin: 0 }}>Настройки футера</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="f_legalName" checked={footerShowLegalName} onChange={e => setFooterShowLegalName(e.target.checked)} />
                  <label htmlFor="f_legalName" style={{ fontSize: "13px", fontWeight: 600 }}>Показывать полное юридическое название (Юлдашев Рустам Хакимович (ИП))</label>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="f_inn" checked={footerShowInn} onChange={e => setFooterShowInn(e.target.checked)} />
                  <label htmlFor="f_inn" style={{ fontSize: "13px", fontWeight: 600 }}>Показывать ИНН</label>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="f_requisites" checked={footerShowBankRequisites} onChange={e => setFooterShowBankRequisites(e.target.checked)} />
                  <label htmlFor="f_requisites" style={{ fontSize: "13px", fontWeight: 600 }}>Показывать банковские реквизиты (р/с, банк, БИК)</label>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="f_branches" checked={footerShowBranchAddresses} onChange={e => setFooterShowBranchAddresses(e.target.checked)} />
                  <label htmlFor="f_branches" style={{ fontSize: "13px", fontWeight: 600 }}>Показывать адреса филиалов образовательной деятельности</label>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="f_legalAddress" checked={footerShowLegalAddress} onChange={e => setFooterShowLegalAddress(e.target.checked)} />
                  <label htmlFor="f_legalAddress" style={{ fontSize: "13px", fontWeight: 600 }}>Показывать юридический адрес (ул. Артемова, 5а, 126)</label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Текст копирайта (поддерживает плейсхолдер {'{year}'} для авто-подстановки года)</label>
                <input type="text" className="form-input" value={footerCopyrightText} onChange={e => setFooterCopyrightText(e.target.value)} placeholder="Например: © {year} Робокс Липецк. Все права защищены." required />
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 12px 0" }}>Ссылки на социальные сети</h4>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">ВКонтакте (VK)</label>
                    <input type="text" className="form-input" value={footerVk} onChange={e => setFooterVk(e.target.value)} placeholder="Ссылка на сообщество" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telegram</label>
                    <input type="text" className="form-input" value={footerTelegram} onChange={e => setFooterTelegram(e.target.value)} placeholder="Ссылка на канал/аккаунт" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input type="text" className="form-input" value={footerWhatsapp} onChange={e => setFooterWhatsapp(e.target.value)} placeholder="Ссылка на чат" />
                  </div>
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary-crm" disabled={saving}>
                  <Save size={16} /> Сохранить настройки футера
                </Button>
              </div>
            </form>
          )}

          {/* TAB 8: MEDIA MANAGER */}
          {activeTab === "media" && (
            <div className="card-crm" style={{ gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Медиа-менеджер</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="file" ref={fileInputRef} onChange={handleUploadFile} style={{ display: "none" }} />
                  <Button variant="primary-crm" disabled={uploadingFile} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> {uploadingFile ? "Загрузка..." : "Загрузить файл"}
                  </Button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 280px", gap: "20px", alignItems: "start" }} className="media-manager-layout">
                {/* 1. Left side: Directories list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { id: "branding", label: "📁 Брендинг и лого" },
                    { id: "teachers", label: "📁 Фото учителей" },
                    { id: "pricing", label: "📁 Тарифы" },
                    { id: "schedule", label: "📁 Расписание" },
                    { id: "legal", label: "📁 Документы" },
                    { id: "misc", label: "📁 Разное" }
                  ].map(folder => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setActiveMediaFolder(folder.id);
                        setSelectedFile(null);
                      }}
                      style={{
                        border: "none",
                        background: activeMediaFolder === folder.id ? "var(--color-primary-soft)" : "#F3F4F6",
                        color: activeMediaFolder === folder.id ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "11px",
                        textAlign: "left"
                      }}
                    >
                      {folder.label}
                    </button>
                  ))}
                </div>

                {/* 2. Center: Files grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px", minHeight: "350px", background: "#F9FAFB", padding: "12px", borderRadius: "8px", border: "1px dashed var(--color-border)" }}>
                  {mediaFiles.map((file, idx) => {
                    const isSelected = selectedFile?.path === file.path;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedFile(file)}
                        style={{
                          background: "white",
                          border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                          borderRadius: "8px",
                          padding: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 4px 12px rgba(70, 62, 142, 0.15)" : "none",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ height: "90px", background: "#F3F4F6", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {file.name.endsWith(".svg") || file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg") ? (
                            <img src={file.url} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          ) : (
                            <FileText size={24} style={{ color: "var(--color-text-muted)" }} />
                          )}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.name}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    );
                  })}

                  {mediaFiles.length === 0 && (
                    <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", padding: "48px 0" }}>
                      <ImageIcon size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
                      <span style={{ fontSize: "12px" }}>В этой папке нет файлов. Загрузите первый!</span>
                    </div>
                  )}
                </div>

                {/* 3. Right side: Details & Action panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#FFFFFF", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px" }}>
                  {selectedFile ? (
                    <>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, margin: 0, borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>Выбранный файл</h4>
                      
                      <div style={{ height: "140px", background: "#F3F4F6", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selectedFile.name.endsWith(".svg") || selectedFile.name.endsWith(".png") || selectedFile.name.endsWith(".jpg") || selectedFile.name.endsWith(".jpeg") ? (
                          <img src={selectedFile.url} alt={selectedFile.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <FileText size={48} style={{ color: "var(--color-text-muted)" }} />
                        )}
                      </div>
                      
                      <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>
                          <strong style={{ display: "block" }}>Путь в хранилище:</strong>
                          <span style={{ wordBreak: "break-all", fontFamily: "monospace", color: "var(--color-text-muted)" }}>{selectedFile.path}</span>
                        </div>
                        <div>
                          <strong style={{ display: "block" }}>Размер:</strong>
                          <span style={{ color: "var(--color-text-muted)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
                        <Button
                          type="button"
                          variant="secondary-crm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(selectedFile.path);
                            alert(`Путь скопирован: ${selectedFile.path}`);
                          }}
                          style={{ width: "100%", fontSize: "11px", height: "32px" }}
                        >
                          Копировать путь
                        </Button>
                        <Button
                          type="button"
                          variant="secondary-crm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(selectedFile.url);
                            alert(`Public URL скопирован: ${selectedFile.url}`);
                          }}
                          style={{ width: "100%", fontSize: "11px", height: "32px" }}
                        >
                          Копировать Public URL
                        </Button>

                        {/* Folder-specific Context actions */}
                        {activeMediaFolder === "branding" && (
                          <>
                            <Button
                              type="button"
                              variant="primary-crm"
                              onClick={async () => {
                                setBrandLogo(selectedFile.path);
                                await saveBlock("site.branding", brandName, "Настройки брендинга", {
                                  logo: selectedFile.path,
                                  favicon: brandFavicon,
                                  primaryColor: brandPrimaryColor,
                                  accentColor: brandAccentColor,
                                  gradient: brandGradient,
                                  logoDisplay: brandLogoDisplay,
                                  logoAlt: brandLogoAlt
                                });
                                setSuccessMsg("Логотип обновлен!");
                              }}
                              style={{ width: "100%", fontSize: "11px", height: "32px", background: "#10b981", color: "white" }}
                            >
                              Использовать как логотип
                            </Button>
                            <Button
                              type="button"
                              variant="primary-crm"
                              onClick={async () => {
                                setBrandFavicon(selectedFile.path);
                                await saveBlock("site.branding", brandName, "Настройки брендинга", {
                                  logo: brandLogo,
                                  favicon: selectedFile.path,
                                  primaryColor: brandPrimaryColor,
                                  accentColor: brandAccentColor,
                                  gradient: brandGradient,
                                  logoDisplay: brandLogoDisplay,
                                  logoAlt: brandLogoAlt
                                });
                                setSuccessMsg("Favicon обновлен!");
                              }}
                              style={{ width: "100%", fontSize: "11px", height: "32px" }}
                            >
                              Использовать как favicon
                            </Button>
                          </>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)" }}>Применить файл к блокам:</span>
                          
                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("home.media", "heroImage", false)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-accent)", color: "white" }}
                          >
                            Использовать в Hero
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("home.facilities", "images", true)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-primary)", color: "white" }}
                          >
                            Добавить в “Фото помещений”
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("home.student_projects", "images", true)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-primary)", color: "white" }}
                          >
                            Добавить в “Проекты учеников”
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("home.lesson_process", "images", true)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-primary)", color: "white" }}
                          >
                            Добавить в “Как проходят занятия”
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("home.equipment", "images", true)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-primary)", color: "white" }}
                          >
                            Добавить в “Классы и оборудование”
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("contacts.media", "images", true)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-primary)", color: "white" }}
                          >
                            Добавить в “Фото контактов”
                          </Button>

                          <Button
                            type="button"
                            variant="primary-crm"
                            onClick={() => handleAssignFileToBlock("site.footer", "mapImage", false)}
                            style={{ width: "100%", fontSize: "11px", height: "30px", background: "var(--color-accent)", color: "white" }}
                          >
                            Использовать как карту в футере
                          </Button>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#f3f4f6", padding: "8px", borderRadius: "6px", marginTop: "4px" }}>
                            <label style={{ fontSize: "10px", fontWeight: 700 }}>Поставить фото преподавателю:</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="form-input"
                                style={{ height: "30px", fontSize: "11px", padding: "0 6px", flex: 1 }}
                              >
                                <option value="">-- Выберите учителя --</option>
                                {staff.filter((s: any) => s.role === "teacher" || s.role === "owner" || s.role === "admin").map((s: any) => (
                                  <option key={s.user_id} value={s.user_id}>{s.full_name || s.email}</option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="primary-crm"
                                disabled={!selectedTeacherId}
                                onClick={async () => {
                                  if (!selectedTeacherId) return;
                                  const { error } = await (supabase
                                    .from("profiles") as any)
                                    .update({ avatar_url: selectedFile.path })
                                    .eq("id", selectedTeacherId);
                                  if (error) {
                                    alert(error.message);
                                  } else {
                                    setSuccessMsg(`Фото установлено преподавателю!`);
                                    await loadData();
                                  }
                                }}
                                style={{ fontSize: "11px", height: "30px", background: "var(--color-primary)", padding: "0 10px" }}
                              >
                                ОК
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "11px", padding: "32px 0" }}>
                      Выберите файл в сетке для просмотра деталей и применения действий
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

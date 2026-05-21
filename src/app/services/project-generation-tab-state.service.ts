import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ProjectGenerationTabStatus = 'generating' | 'repairing' | 'completed' | 'error';

export interface ProjectGenerationPreviewData {
  templateId: string;
  pages?: any;
  login_redirect?: any;
  reactBuildUrl?: string | null;
  variation?: any;
}

export interface ProjectGenerationTabState {
  inquiryId: string;
  projectId?: string;
  projectName: string;
  projectData?: any;
  finalPrompt?: string | null;
  jobId?: string | null;
  status: ProjectGenerationTabStatus;
  errorMessage?: string | null;
  previewData?: ProjectGenerationPreviewData | null;
  updatedAt: number;
}

interface ProjectGenerationStore {
  activeInquiryId: string | null;
  tabs: Record<string, ProjectGenerationTabState>;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectGenerationTabStateService {
  private readonly storageKey = 'workspace_project_generation_tabs_v1';
  private readonly activeInquiryStorageKey = 'workspace_active_inquiry_id_v1';
  private readonly stateSubject = new BehaviorSubject<ProjectGenerationStore>(this.loadStore());

  readonly state$ = this.stateSubject.asObservable();

  getAllTabs(): ProjectGenerationTabState[] {
    return Object.values(this.stateSubject.value.tabs).sort((left, right) => right.updatedAt - left.updatedAt);
  }

  getActiveInquiryId(): string | null {
    return this.stateSubject.value.activeInquiryId || null;
  }

  setActiveInquiryId(inquiryId: string | null): void {
    this.updateStore((store) => ({
      ...store,
      activeInquiryId: inquiryId?.trim() || null
    }));
  }

  getTabState(inquiryId?: string | null): ProjectGenerationTabState | null {
    const normalizedInquiryId = inquiryId?.trim();
    if (!normalizedInquiryId) {
      return null;
    }

    return this.stateSubject.value.tabs[normalizedInquiryId] || null;
  }

  createOrUpdateTab(tab: {
    inquiryId: string;
    projectId?: string | number | null;
    projectName?: string | null;
    projectData?: any;
    finalPrompt?: string | null;
    status?: ProjectGenerationTabStatus;
  }): void {
    const normalizedInquiryId = tab.inquiryId?.trim();
    if (!normalizedInquiryId) {
      return;
    }

    this.updateTabState(normalizedInquiryId, (currentTab) => ({
      inquiryId: normalizedInquiryId,
      projectId: this.normalizeOptionalString(tab.projectId),
      projectName: tab.projectName?.trim() || currentTab?.projectName || 'New Project',
      projectData: tab.projectData ?? currentTab?.projectData,
      finalPrompt: tab.finalPrompt ?? currentTab?.finalPrompt ?? null,
      jobId: currentTab?.jobId ?? null,
      status: tab.status ?? currentTab?.status ?? 'generating',
      errorMessage: currentTab?.errorMessage ?? null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  setJobId(inquiryId: string, jobId: string): void {
    const normalizedJobId = jobId?.trim();
    if (!normalizedJobId) {
      return;
    }

    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: normalizedJobId,
      status: 'generating',
      errorMessage: null,
      previewData: null,
      updatedAt: Date.now()
    }));
  }

  markGenerating(inquiryId: string): void {
    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: currentTab?.jobId ?? null,
      status: 'generating',
      errorMessage: null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  clearJobId(inquiryId: string): void {
    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: null,
      status: currentTab?.status ?? 'generating',
      errorMessage: currentTab?.errorMessage ?? null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  markRepairing(inquiryId: string, errorMessage?: string | null): void {
    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: currentTab?.jobId ?? null,
      status: 'repairing',
      errorMessage: errorMessage ?? currentTab?.errorMessage ?? null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  markCompleted(inquiryId: string, previewData: ProjectGenerationPreviewData): void {
    if (!previewData?.templateId) {
      return;
    }

    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: null,
      status: 'completed',
      errorMessage: null,
      previewData,
      updatedAt: Date.now()
    }));
  }

  markError(inquiryId: string, errorMessage?: string | null): void {
    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: currentTab?.projectId,
      projectName: currentTab?.projectName || 'New Project',
      projectData: currentTab?.projectData,
      finalPrompt: currentTab?.finalPrompt ?? null,
      jobId: null,
      status: 'error',
      errorMessage: errorMessage || currentTab?.errorMessage || null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  updateProjectData(inquiryId: string, updates: {
    projectId?: string | number | null;
    projectName?: string | null;
    projectData?: any;
    finalPrompt?: string | null;
  }): void {
    this.updateTabState(inquiryId, (currentTab) => ({
      inquiryId: inquiryId.trim(),
      projectId: this.normalizeOptionalString(updates.projectId) ?? currentTab?.projectId,
      projectName: updates.projectName?.trim() || currentTab?.projectName || 'New Project',
      projectData: updates.projectData ?? currentTab?.projectData,
      finalPrompt: updates.finalPrompt ?? currentTab?.finalPrompt ?? null,
      jobId: currentTab?.jobId ?? null,
      status: currentTab?.status ?? 'generating',
      errorMessage: currentTab?.errorMessage ?? null,
      previewData: currentTab?.previewData ?? null,
      updatedAt: Date.now()
    }));
  }

  clearTab(inquiryId?: string | null): void {
    const normalizedInquiryId = inquiryId?.trim();
    if (!normalizedInquiryId) {
      return;
    }

    this.updateStore((store) => {
      if (!store.tabs[normalizedInquiryId]) {
        return store;
      }

      const nextTabs = { ...store.tabs };
      delete nextTabs[normalizedInquiryId];

      return {
        activeInquiryId: store.activeInquiryId === normalizedInquiryId ? null : store.activeInquiryId,
        tabs: nextTabs
      };
    });
  }

  clearAll(): void {
    this.persistStore({ activeInquiryId: null, tabs: {} });
    this.stateSubject.next({ activeInquiryId: null, tabs: {} });
  }

  private updateTabState(
    inquiryId: string,
    updater: (currentTab: ProjectGenerationTabState | null) => ProjectGenerationTabState
  ): void {
    const normalizedInquiryId = inquiryId?.trim();
    if (!normalizedInquiryId) {
      return;
    }

    this.updateStore((store) => {
      const currentTab = store.tabs[normalizedInquiryId] || null;
      const nextTab = updater(currentTab);

      return {
        ...store,
        tabs: {
          ...store.tabs,
          [normalizedInquiryId]: {
            ...nextTab,
            inquiryId: normalizedInquiryId,
            projectName: nextTab.projectName?.trim() || currentTab?.projectName || 'New Project',
            updatedAt: Date.now()
          }
        }
      };
    });
  }

  private updateStore(updater: (store: ProjectGenerationStore) => ProjectGenerationStore): void {
    const nextStore = updater(this.stateSubject.value);
    this.persistStore(nextStore);
    this.stateSubject.next(nextStore);
  }

  private loadStore(): ProjectGenerationStore {
    const emptyStore: ProjectGenerationStore = { activeInquiryId: null, tabs: {} };
    if (typeof localStorage === 'undefined') {
      return emptyStore;
    }

    try {
      const rawStore = localStorage.getItem(this.storageKey);
      const rawActiveInquiryId = localStorage.getItem(this.activeInquiryStorageKey);
      if (!rawStore) {
        return {
          activeInquiryId: rawActiveInquiryId?.trim() || null,
          tabs: {}
        };
      }

      const parsedStore = JSON.parse(rawStore) as ProjectGenerationStore;
      return {
        activeInquiryId: rawActiveInquiryId?.trim() || parsedStore?.activeInquiryId || null,
        tabs: parsedStore?.tabs && typeof parsedStore.tabs === 'object' ? parsedStore.tabs : {}
      };
    } catch {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.activeInquiryStorageKey);
      return emptyStore;
    }
  }

  private persistStore(store: ProjectGenerationStore): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));

    if (store.activeInquiryId) {
      localStorage.setItem(this.activeInquiryStorageKey, store.activeInquiryId);
      return;
    }

    localStorage.removeItem(this.activeInquiryStorageKey);
  }

  private normalizeOptionalString(value?: string | number | null): string | undefined {
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue || undefined;
  }
}

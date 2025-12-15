import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Search,
  FileCode,
  FileJson,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  GitHubTreeEntry,
  LIMITS,
  isCodeFile,
  getFileExtension,
  estimateTokens,
} from "@/lib/gitRepo";

interface TreeNode {
  path: string;
  name: string;
  type: "blob" | "tree";
  children: TreeNode[];
  size?: number;
}

interface GitRepoSelectorProps {
  tree: GitHubTreeEntry[];
  selectedPaths: string[];
  fileContents: Record<string, string>;
  onSelectionChange: (paths: string[]) => void;
}

// Build hierarchical tree from flat list
function buildTree(entries: GitHubTreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort entries so directories come before files
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "tree" ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/");
    const name = parts[parts.length - 1];

    const node: TreeNode = {
      path: entry.path,
      name,
      type: entry.type,
      children: [],
      size: entry.size,
    };

    nodeMap.set(entry.path, node);

    if (parts.length === 1) {
      // Root level
      root.push(node);
    } else {
      // Find parent
      const parentPath = parts.slice(0, -1).join("/");
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

// Get file icon based on extension
function getFileIcon(path: string) {
  const ext = getFileExtension(path);

  if (["ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java", "kt"].includes(ext)) {
    return <FileCode className="h-4 w-4 text-blue-400" />;
  }
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) {
    return <FileJson className="h-4 w-4 text-yellow-400" />;
  }
  if (["md", "txt", "rst", "adoc"].includes(ext)) {
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
  if (isCodeFile(path)) {
    return <FileCode className="h-4 w-4 text-muted-foreground" />;
  }

  return <File className="h-4 w-4 text-muted-foreground" />;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onToggleSelect: (path: string, isDirectory: boolean) => void;
  filterQuery: string;
}

function TreeNodeComponent({
  node,
  level,
  selectedPaths,
  expandedPaths,
  onToggleExpand,
  onToggleSelect,
  filterQuery,
}: TreeNodeComponentProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPaths.has(node.path);
  const isDirectory = node.type === "tree";

  // Filter check
  const matchesFilter = !filterQuery ||
    node.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    node.path.toLowerCase().includes(filterQuery.toLowerCase());

  // Check if any children match filter
  const hasMatchingChildren = node.children.some(
    (child) =>
      child.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      child.path.toLowerCase().includes(filterQuery.toLowerCase()) ||
      child.children.length > 0
  );

  // Don't render if doesn't match and no children match
  if (filterQuery && !matchesFilter && !hasMatchingChildren) {
    return null;
  }

  // For directories, check if all children are selected
  const allChildrenSelected = isDirectory && node.children.length > 0 &&
    node.children.every((child) =>
      child.type === "blob"
        ? selectedPaths.has(child.path)
        : child.children.every((c) => selectedPaths.has(c.path))
    );

  // Check if some children are selected
  const someChildrenSelected = isDirectory && !allChildrenSelected &&
    node.children.some((child) =>
      selectedPaths.has(child.path) ||
      (child.type === "tree" &&
        child.children.some((c) => selectedPaths.has(c.path)))
    );

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-1 rounded hover:bg-white/5 cursor-pointer group ${
          matchesFilter && filterQuery ? "bg-ice-glow/10" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        {/* Expand/Collapse for directories */}
        {isDirectory ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.path);
            }}
            className="p-0.5 hover:bg-white/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" /> // Spacer for files
        )}

        {/* Checkbox */}
        <Checkbox
          checked={isSelected || allChildrenSelected}
          onCheckedChange={() => onToggleSelect(node.path, isDirectory)}
          className="h-4 w-4"
          data-state={someChildrenSelected ? "indeterminate" : undefined}
        />

        {/* Icon */}
        <span className="flex-shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-yellow-500" />
            ) : (
              <Folder className="h-4 w-4 text-yellow-500" />
            )
          ) : (
            getFileIcon(node.path)
          )}
        </span>

        {/* Name */}
        <span
          className="text-sm truncate flex-1"
          onClick={() => {
            if (isDirectory) {
              onToggleExpand(node.path);
            } else {
              onToggleSelect(node.path, false);
            }
          }}
        >
          {node.name}
        </span>

        {/* Size for files */}
        {!isDirectory && node.size && (
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
            {node.size < 1024
              ? `${node.size}B`
              : node.size < 1024 * 1024
              ? `${(node.size / 1024).toFixed(1)}KB`
              : `${(node.size / (1024 * 1024)).toFixed(1)}MB`}
          </span>
        )}
      </div>

      {/* Children */}
      {isDirectory && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
              selectedPaths={selectedPaths}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              filterQuery={filterQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GitRepoSelector({
  tree,
  selectedPaths,
  fileContents,
  onSelectionChange,
}: GitRepoSelectorProps) {
  const { t } = useLanguage();
  const [filterQuery, setFilterQuery] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const treeNodes = useMemo(() => buildTree(tree), [tree]);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  // Estimate total tokens
  const totalTokens = useMemo(() => {
    let total = 0;
    for (const path of selectedPaths) {
      const content = fileContents[path];
      if (content) {
        total += estimateTokens(content);
      }
    }
    return total;
  }, [selectedPaths, fileContents]);

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleToggleSelect = (path: string, isDirectory: boolean) => {
    const newSelected = new Set(selectedPaths);

    if (isDirectory) {
      // Toggle all files in directory
      const dirPrefix = path + "/";
      const filesInDir = tree.filter(
        (e) => e.type === "blob" && (e.path === path || e.path.startsWith(dirPrefix))
      );

      const allSelected = filesInDir.every((f) => newSelected.has(f.path));

      if (allSelected) {
        // Deselect all
        filesInDir.forEach((f) => newSelected.delete(f.path));
      } else {
        // Select all (up to limit)
        for (const f of filesInDir) {
          if (newSelected.size >= LIMITS.MAX_SELECTED_PATHS) break;
          newSelected.add(f.path);
        }
      }
    } else {
      // Toggle single file
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else if (newSelected.size < LIMITS.MAX_SELECTED_PATHS) {
        newSelected.add(path);
      }
    }

    onSelectionChange(Array.from(newSelected));
  };

  // Auto-expand when filtering
  const effectiveExpanded = useMemo(() => {
    if (!filterQuery) return expandedPaths;

    // Expand all directories containing matches
    const expanded = new Set(expandedPaths);
    for (const entry of tree) {
      if (
        entry.path.toLowerCase().includes(filterQuery.toLowerCase())
      ) {
        // Expand all parent directories
        const parts = entry.path.split("/");
        for (let i = 1; i < parts.length; i++) {
          expanded.add(parts.slice(0, i).join("/"));
        }
      }
    }
    return expanded;
  }, [filterQuery, tree, expandedPaths]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t("git.filterFiles")}
          className="h-8 text-sm pl-8"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {selectedPaths.length}/{LIMITS.MAX_SELECTED_PATHS} {t("git.filesSelected")}
        </span>
        <span
          className={
            totalTokens > LIMITS.MAX_CONTEXT_TOKENS * 0.8
              ? "text-yellow-500"
              : ""
          }
        >
          ~{totalTokens.toLocaleString()} {t("context.tokens")}
        </span>
      </div>

      {/* Tree */}
      <div className="max-h-[300px] overflow-y-auto border rounded-lg p-1 bg-black/20">
        {treeNodes.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t("git.noFilesInRepo")}
          </div>
        ) : (
          treeNodes.map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              level={0}
              selectedPaths={selectedSet}
              expandedPaths={effectiveExpanded}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              filterQuery={filterQuery}
            />
          ))
        )}
      </div>

      {/* Limit Warning */}
      {selectedPaths.length >= LIMITS.MAX_SELECTED_PATHS && (
        <p className="text-xs text-yellow-500 text-center">
          {t("git.maxFilesReached")}
        </p>
      )}
    </div>
  );
}

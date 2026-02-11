import { useNavigate } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

export const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/site/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon
          className="text-surface-400 dark:text-surface-500"
          size={15}
        />
      </div>
      <input
        className="
          w-full bg-surface-100 dark:bg-surface-800/80 rounded-lg pl-9 pr-4 py-2 text-sm
          text-surface-900 dark:text-white placeholder:text-surface-400
          dark:placeholder:text-surface-500
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white
          dark:focus:bg-surface-800 transition-all
          border border-surface-200/60 dark:border-surface-700/60
        "
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearch}
        placeholder="Search..."
        value={searchQuery}
        type="text"
      />
    </div>
  );
};

export default Search;

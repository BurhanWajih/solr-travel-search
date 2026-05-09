/**
 * ========================================
 * Pakistan Travel Explorer - Main App
 * ========================================
 * A React frontend that queries Apache Solr
 * for travel destination data in Pakistan.
 *
 * Key Concepts Used:
 *  - useState  → to manage state (search term, results, page, etc.)
 *  - useEffect → to fetch data when filters/page change
 *  - fetch     → to call the Solr REST API
 * ========================================
 */

import { useState, useEffect } from "react";
import "./App.css";

// ─── CONFIGURATION ──────────────────────────────────────────
// Base URL of our Solr core — uses a relative path so Vite proxies
// the request to http://localhost:8983, avoiding CORS browser errors.
const SOLR_URL = "/solr/traveldata/select";
const ROWS_PER_PAGE = 6; // how many results to show per page

// ─── HELPER: Build the Solr query URL ───────────────────────
// This function constructs the full URL with query parameters.
function buildSolrUrl(query, category, sortOption, page) {
  // 'start' tells Solr which result to begin from (for pagination)
  const start = page * ROWS_PER_PAGE;

  // URLSearchParams makes it easy to build query strings
  const params = new URLSearchParams();

  // 'q' is the main search query. If empty, use *:* to match everything.
  params.append("q", query.trim() ? query.trim() : "*:*");

  // 'fq' is a filter query — used here for category filtering
  if (category && category !== "all") {
    params.append("fq", `category:"${category}"`);
  }

  // 'sort' tells Solr how to order results
  if (sortOption === "price_asc") {
    params.append("sort", "price asc");
  } else if (sortOption === "price_desc") {
    params.append("sort", "price desc");
  } else if (sortOption === "rating_desc") {
    params.append("sort", "rating desc");
  }

  // Pagination parameters
  params.append("start", start);
  params.append("rows", ROWS_PER_PAGE);

  // Response format
  params.append("wt", "json");

  // Enable highlighting so Solr marks matching words
  params.append("hl", "true");
  params.append("hl.fl", "description,name");
  params.append("hl.simple.pre", "<mark>");
  params.append("hl.simple.post", "</mark>");

  return `${SOLR_URL}?${params.toString()}`;
}

// ─── HELPER: Safely unwrap Solr fields ──────────────────────
// Solr often returns field values as arrays (e.g. ["Lahore"]).
// This helper extracts the first element if it's an array.
function unwrap(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

// ─── MAIN APP COMPONENT ─────────────────────────────────────
function App() {
  // ── State Variables ──
  const [searchTerm, setSearchTerm] = useState("");   // what the user types
  const [category, setCategory] = useState("all");    // selected category filter
  const [sortOption, setSortOption] = useState("");    // selected sort option
  const [results, setResults] = useState([]);          // array of result docs
  const [highlighting, setHighlighting] = useState({}); // Solr highlighting data
  const [totalResults, setTotalResults] = useState(0); // total matching docs
  const [currentPage, setCurrentPage] = useState(0);  // current page (0-indexed)
  const [loading, setLoading] = useState(false);       // loading spinner flag
  const [error, setError] = useState(null);            // error message
  const [hasSearched, setHasSearched] = useState(false); // tracks if user searched

  // ── Fetch results from Solr ──
  // This function is called when the user clicks "Search" or changes page.
  const fetchResults = async (page = 0) => {
    setLoading(true);
    setError(null);
    setCurrentPage(page);
    setHasSearched(true);

    try {
      const url = buildSolrUrl(searchTerm, category, sortOption, page);
      console.log("Fetching:", url); // helpful for debugging

      const response = await fetch(url);

      // If Solr is not running or returns an error
      if (!response.ok) {
        throw new Error(`Solr returned status ${response.status}`);
      }

      const data = await response.json();

      // Solr puts results inside response.docs
      setResults(data.response.docs);
      setTotalResults(data.response.numFound);

      // Highlighting data (if available)
      if (data.highlighting) {
        setHighlighting(data.highlighting);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        "Could not connect to Solr. Make sure Apache Solr is running on localhost:8983 and the 'traveldata' core exists."
      );
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle search form submission ──
  const handleSearch = (e) => {
    e.preventDefault(); // prevent page reload
    fetchResults(0);    // always start from page 0
  };

  // ── When category or sort changes, re-fetch from page 0 ──
  useEffect(() => {
    if (hasSearched) {
      fetchResults(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortOption]);

  // ── Calculate total pages for pagination ──
  const totalPages = Math.ceil(totalResults / ROWS_PER_PAGE);

  // ── Get highlighted text or fall back to original ──
  // Solr returns highlighted snippets keyed by document ID
  const getHighlightedField = (docId, field, fallback) => {
    if (highlighting[docId] && highlighting[docId][field]) {
      return highlighting[docId][field][0]; // Solr returns an array
    }
    return fallback;
  };

  // ── Render star rating as emoji stars ──
  const renderStars = (rating) => {
    const stars = Math.round(rating);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };

  // ═══════════════════════════════════════
  //               JSX / UI
  // ═══════════════════════════════════════
  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🏔️</span>
            <h1>Pakistan Travel Explorer</h1>
          </div>
          <p className="tagline">
            Discover the beauty of Pakistan — from the peaks of the North to the shores of the South
          </p>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        {/* ── SEARCH BAR ── */}
        <form className="search-section" onSubmit={handleSearch}>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search destinations, cities, activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </div>

          {/* ── FILTERS ROW ── */}
          <div className="filters-row">
            {/* Category Filter Dropdown */}
            <div className="filter-group">
              <label htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                <option value="Adventure">Adventure</option>
                <option value="Cultural">Cultural</option>
                <option value="Nature">Nature</option>
                <option value="Historical">Historical</option>
                <option value="Religious">Religious</option>
                <option value="Beach">Beach</option>
                <option value="Wildlife">Wildlife</option>
                <option value="Mountain">Mountain</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="filter-group">
              <label htmlFor="sort-option">Sort By</label>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="filter-select"
              >
                <option value="">Relevance</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="rating_desc">Rating: Best First</option>
              </select>
            </div>

            {/* Result Count Badge */}
            {hasSearched && !loading && (
              <div className="result-count">
                <span className="result-badge">{totalResults}</span> results found
              </div>
            )}
          </div>
        </form>

        {/* ── ERROR STATE ── */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div>
              <strong>Connection Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Searching destinations...</p>
          </div>
        )}

        {/* ── NO RESULTS STATE ── */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="no-results">
            <span className="no-results-icon">🏜️</span>
            <h2>No destinations found</h2>
            <p>Try adjusting your search terms or filters</p>
          </div>
        )}

        {/* ── RESULTS GRID ── */}
        {!loading && results.length > 0 && (
          <div className="results-grid">
            {results.map((doc) => (
              <div className="result-card" key={doc.id}>
                {/* Category Badge */}
                <div className="card-category">
                  {unwrap(doc.category) || "General"}
                </div>

                {/* Card Body */}
                <div className="card-body">
                  {/* Destination Name — may contain <mark> tags from highlighting */}
                  <h2
                    className="card-title"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedField(
                        doc.id,
                        "name",
                        unwrap(doc.name) || unwrap(doc.destination_name) || "Unknown Destination"
                      ),
                    }}
                  />

                  {/* City */}
                  <div className="card-city">
                    <span>📍</span> {unwrap(doc.city) || "Pakistan"}
                  </div>

                  {/* Description — may contain <mark> tags from highlighting */}
                  <p
                    className="card-description"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedField(
                        doc.id,
                        "description",
                        unwrap(doc.description) || "No description available."
                      ),
                    }}
                  />

                  {/* Card Footer: Price + Rating */}
                  <div className="card-footer">
                    <div className="card-price">
                      <span className="price-label">From</span>
                      <span className="price-value">
                        Rs. {unwrap(doc.price) ? Number(unwrap(doc.price)).toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div className="card-rating">
                      <span className="stars">
                        {unwrap(doc.rating) ? renderStars(Number(unwrap(doc.rating))) : "—"}
                      </span>
                      <span className="rating-number">
                        {unwrap(doc.rating) ? Number(unwrap(doc.rating)).toFixed(1) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            {/* Previous Button */}
            <button
              className="page-btn"
              disabled={currentPage === 0}
              onClick={() => fetchResults(currentPage - 1)}
            >
              ← Previous
            </button>

            {/* Page Numbers */}
            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`page-num ${i === currentPage ? "active" : ""}`}
                  onClick={() => fetchResults(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              className="page-btn"
              disabled={currentPage >= totalPages - 1}
              onClick={() => fetchResults(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <p>Pakistan Travel Explorer — PDC OEL Lab 13 Project</p>
        <p className="footer-note">Powered by Apache Solr & React</p>
      </footer>
    </div>
  );
}

export default App;

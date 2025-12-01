import "./App.css"
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useMemo,
} from "react";

const POST_API_URL = "https://jsonplaceholder.typicode.com/posts";
const PAGE_SIZE = 6;
const INITIAL_STATE = {
  allPosts: [],
  removedPostIds: new Set(), 
  currentPage: 1, 
  isLoading: true,
  error: null,
};

const ACTION_TYPES = {
  SET_POSTS: "SET_POSTS",
  REMOVE_POST: "REMOVE_POST",
  SET_PAGE: "SET_PAGE",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
};

function postReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ACTION_TYPES.SET_POSTS:
      return {
        ...state,
        allPosts: action.payload,
        isLoading: false,
        error: null,
      };
    case ACTION_TYPES.REMOVE_POST:
      const newRemovedIds = new Set(state.removedPostIds);
      newRemovedIds.add(action.payload);
      return {
        ...state,
        removedPostIds: newRemovedIds,
       
      };
    case ACTION_TYPES.SET_PAGE:
      return { ...state, currentPage: action.payload };
    default:
      return state;
  }
}

const PostContext = createContext();

function usePosts() {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error("usePosts must be used within a PostProvider");
  }
  return context;
}

const PostProvider = ({ children }) => {
  const [state, dispatch] = useReducer(postReducer, INITIAL_STATE);

  const visiblePosts = useMemo(() => {
    return state.allPosts.filter((post) => !state.removedPostIds.has(post.id));
  }, [state.allPosts, state.removedPostIds]);

  const totalPosts = visiblePosts.length;
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

  const effectiveCurrentPage =
    state.currentPage > totalPages && totalPages > 0
      ? totalPages
      : state.currentPage < 1
      ? 1
      : state.currentPage;

  const currentCards = useMemo(() => {
    const startIndex = (effectiveCurrentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return visiblePosts.slice(startIndex, endIndex);
  }, [visiblePosts, effectiveCurrentPage]);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      const fetchData = async () => {
        try {
          const response = await fetch(POST_API_URL);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          dispatch({ type: ACTION_TYPES.SET_POSTS, payload: data });
        } catch (error) {
          console.error("Fetch error:", error);
          dispatch({
            type: ACTION_TYPES.SET_ERROR,
            payload: "Failed to load posts. Check network connection.",
          });
        }
      };
      fetchData();
    }, 5000);

    return () => clearTimeout(loadingTimer);
  }, []);

  const removePost = (id) => {
    dispatch({ type: ACTION_TYPES.REMOVE_POST, payload: id });
  };

  const setPage = (page) => {
    if ((page >= 1 && page <= totalPages) || totalPages === 0) {
      dispatch({ type: ACTION_TYPES.SET_PAGE, payload: page });
    }
  };

  const contextValue = {
    ...state,
    visiblePosts,
    currentCards,
    totalPages,
    currentPage: effectiveCurrentPage,
    removePost,
    setPage,
  };

  return (
    <PostContext.Provider value={contextValue}>{children}</PostContext.Provider>
  );
};


const PostCard = React.memo(({ post }) => {
  const { removePost } = usePosts();

  const handleRemove = () => {
    removePost(post.id);
  };

  return (
    <div className="post-card transition transform hover:scale-[1.02] border-t-4 border-indigo-500 flex flex-col justify-between h-full">
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3">{post.body}</p>
      </div>
      <div className="post-footer items-center">
        <span className="text-xs font-mono text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
          ID: {post.id}
        </span>
        <button
          onClick={handleRemove}
          className="p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full transition duration-150 shadow-md hover:shadow-lg"
          aria-label={`Remove post ${post.id}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

const PostList = () => {
  const { currentCards, isLoading, error } = usePosts();

  if (isLoading) {
    return (
      <div className="text-center py-20 text-3xl font-semibold text-indigo-600">
        Loading... (5 seconds delay)
        <div className="mt-4 w-12 h-12 border-4 border-t-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 bg-red-100 p-8 rounded-lg shadow-inner">
        <p className="font-bold text-xl mb-2">Error Loading Data</p>
        <p>{error}</p>
      </div>
    );
  }

  if (currentCards.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-2xl font-semibold">No Posts Available</p>
        <p className="mt-2">You might have removed all the posts!</p>
      </div>
    );
  }

  return (
    <div className="post-grid">
      {currentCards.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

const Pagination = () => {
  const { totalPages, currentPage, setPage } = usePosts();

  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center space-x-2 mt-8 p-4 bg-gray-50 rounded-xl shadow-inner">
      <button
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-200 transition font-medium"
      >
        Previous
      </button>

      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => setPage(page)}
          className={`
            w-10 h-10 rounded-full font-bold transition duration-200
            ${
              currentPage === page
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300"
                : "bg-white text-gray-700 hover:bg-indigo-50 border border-gray-200"
            }
          `}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-200 transition font-medium"
      >
        Next
      </button>
    </div>
  );
};

const App = () => (
  <PostProvider>
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center py-8 mb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Dynamic Post Viewer
          </h1>
          <p className="mt-2 text-lg text-indigo-600">
            {PAGE_SIZE} Cards per Page | Context API State
          </p>
        </header>

        <main>
          <PostList />
          <Pagination />
        </main>
      </div>
    </div>
  </PostProvider>
);

export default App;

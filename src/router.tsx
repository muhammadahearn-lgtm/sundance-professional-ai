import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { RouteError, RouteNotFound, RoutePending } from "@/components/app/RouteStates";

/** Don't keep retrying requests that will never succeed (permission/not-found/validation). */
function shouldRetry(failureCount: number, error: unknown) {
  const status = (error as { status?: number; code?: string } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
    queryCache: new QueryCache({
      // Background refreshes that fail keep showing old data; tell the person once.
      onError: (_error, query) => {
        if (query.state.data !== undefined) toast.error("Couldn't refresh the latest data. Showing what we had.", { id: "refresh-failed" });
      },
    }),
    mutationCache: new MutationCache({
      // Fallback so a failed save is never silent when a screen has no message of its own.
      onError: (error, _v, _c, mutation) => {
        if (mutation.options.onError) return;
        const msg = error instanceof Error && error.message ? error.message : "Please try again.";
        toast.error(`That didn't save. ${msg}`);
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 400,
  });

  return router;
};

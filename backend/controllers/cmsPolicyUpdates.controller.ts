import type { Request, Response } from "../http/types";
import {
  listCmsPolicyUpdates,
  getUnreadCount,
  createCmsPolicyUpdate,
  markCmsUpdateAsRead,
  updateCmsUpdateNotes,
  deleteCmsPolicyUpdate,
  listFeedSources,
  createFeedSource,
  deleteFeedSource,
} from "../services/cmsPolicyUpdates.service";

export async function listCmsPolicyUpdatesController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const impactLevel = url.searchParams.get("impactLevel") || undefined;
    const isReadParam = url.searchParams.get("isRead");
    const isRead = isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;

    const [data, unreadCount] = await Promise.all([
      listCmsPolicyUpdates({ impactLevel, isRead }),
      getUnreadCount(),
    ]);

    return res.json({ success: true, data, unreadCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list CMS updates";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createCmsPolicyUpdateController(req: Request, res: Response) {
  try {
    const body = req.body as {
      feedSourceId?: string;
      title: string;
      sourceUrl: string;
      sourceName?: string;
      publishedAt?: string;
      summary?: string;
      keywords?: string[];
      impactLevel?: string;
    };

    if (!body.title || !body.sourceUrl) {
      return res.status(400).json({ error: "title and sourceUrl are required" });
    }

    const update = await createCmsPolicyUpdate(body);
    return res.status(201).json({ success: true, data: update });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create CMS update";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function patchCmsPolicyUpdateController(req: Request, res: Response) {
  try {
    const body = req.body as {
      id: string;
      action: "markRead" | "updateNotes";
      notes?: string;
    };

    if (!body.id || !body.action) {
      return res.status(400).json({ error: "id and action are required" });
    }

    const userId = res.locals.userId as string;

    if (body.action === "markRead") {
      const updated = await markCmsUpdateAsRead(body.id, userId);
      return res.json({ success: true, data: updated });
    }

    if (body.action === "updateNotes") {
      const updated = await updateCmsUpdateNotes(body.id, body.notes ?? "");
      return res.json({ success: true, data: updated });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update CMS entry";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteCmsPolicyUpdateController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }
    await deleteCmsPolicyUpdate(id);
    return res.json({ success: true, message: "CMS update deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete CMS update";
    return res.status(500).json({ success: false, error: message });
  }
}

// ─── Feed Sources ───────────────────────────────────────────────────────────

export async function listFeedSourcesController(_req: Request, res: Response) {
  try {
    const sources = await listFeedSources();
    return res.json({ success: true, data: sources });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list feed sources";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createFeedSourceController(req: Request, res: Response) {
  try {
    const body = req.body as { name: string; feedUrl: string; region?: string };
    if (!body.name || !body.feedUrl) {
      return res.status(400).json({ error: "name and feedUrl are required" });
    }
    const source = await createFeedSource(body);
    return res.status(201).json({ success: true, data: source });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create feed source";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteFeedSourceController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }
    await deleteFeedSource(id);
    return res.json({ success: true, message: "Feed source deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete feed source";
    return res.status(500).json({ success: false, error: message });
  }
}

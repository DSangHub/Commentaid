export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-side only. The YouTube key is read from an environment variable and is
// NEVER hardcoded here, so nothing secret is ever committed to the repo.
// Set YOUTUBE_API_KEY in the Vercel project's Environment Variables.
const API_KEY = process.env.YOUTUBE_API_KEY;
// Default channel = the Comment-aid brand channel (@comment-aid). It has no
// comments until it has videos, so the dashboard shows a clean empty state until
// then; typing the Cistyr channel loads the demo data with real comments.
const DEFAULT_CHANNEL = process.env.YT_CHANNEL_ID || "UCwB5DzLugZPjQL6WOD19OPQ";

const YT = "https://www.googleapis.com/youtube/v3";

async function j(url) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

// Turn whatever the user typed (a channel ID, an @handle, a full URL) into a channel ID.
async function resolveChannelId(input) {
  let v = (input || "").trim();
  if (!v) return DEFAULT_CHANNEL;

  // Full URL forms
  const chMatch = v.match(/channel\/(UC[\w-]{20,})/);
  if (chMatch) return chMatch[1];
  const handleUrl = v.match(/@([\w.\-]+)/);
  if (handleUrl) v = handleUrl[1];

  // Bare channel ID
  if (/^UC[\w-]{20,}$/.test(v)) return v;

  // Otherwise treat as a handle
  const handle = v.replace(/^@/, "");
  const data = await j(`${YT}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${API_KEY}`);
  if (data.items && data.items[0]) return data.items[0].id;
  return null;
}

export async function GET(request) {
  try {
    if (!API_KEY) {
      return Response.json({ error: "YouTube isn't configured yet. Add YOUTUBE_API_KEY in the Vercel project settings." }, { status: 200 });
    }
    const { searchParams } = new URL(request.url);
    const channelId = await resolveChannelId(searchParams.get("channel"));

    if (!channelId) {
      return Response.json(
        { error: "Couldn't find that channel. Try a channel handle (like @name), a channel ID (starts with UC…), or a channel URL." },
        { status: 200 }
      );
    }

    const chData = await j(
      `${YT}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`
    );
    if (chData.error) {
      return Response.json({ error: chData.error.message || "YouTube API error" }, { status: 200 });
    }
    const ch = (chData.items || [])[0];
    const channel = ch
      ? {
          id: channelId,
          title: ch.snippet.title,
          thumb: ch.snippet.thumbnails?.default?.url || null,
          subscribers: ch.statistics?.subscriberCount || null,
          videos: ch.statistics?.videoCount || null
        }
      : { id: channelId, title: "Channel" };

    const ctData = await j(
      `${YT}/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&maxResults=100&order=time&textFormat=plainText&key=${API_KEY}`
    );
    if (ctData.error) {
      const msg = ctData.error.message || "YouTube API error";
      return Response.json({ channel, comments: [], notice: msg }, { status: 200 });
    }

    const items = ctData.items || [];
    const videoIds = [...new Set(items.map((it) => it.snippet.videoId).filter(Boolean))];
    let titles = {};
    if (videoIds.length) {
      const vData = await j(`${YT}/videos?part=snippet&id=${videoIds.join(",")}&key=${API_KEY}`);
      (vData.items || []).forEach((v) => { titles[v.id] = v.snippet.title; });
    }

    const comments = items.map((it) => {
      const s = it.snippet.topLevelComment.snippet;
      return {
        id: it.id,
        author: s.authorDisplayName,
        authorImage: s.authorProfileImageUrl || null,
        authorChannelUrl: s.authorChannelUrl || null,
        text: s.textOriginal || s.textDisplay || "",
        publishedAt: s.publishedAt,
        likeCount: s.likeCount || 0,
        replyCount: it.snippet.totalReplyCount || 0,
        videoId: it.snippet.videoId,
        videoTitle: titles[it.snippet.videoId] || "Video"
      };
    });

    return Response.json({ channel, comments, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

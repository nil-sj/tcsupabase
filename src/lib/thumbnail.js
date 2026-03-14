import articlesImg from "../assets/category-defaults/articles.png";
import booksImg from "../assets/category-defaults/books.png";
import coursesImg from "../assets/category-defaults/courses.png";
import youtubeVideosImg from "../assets/category-defaults/youtube-videos.png";
import githubReposImg from "../assets/category-defaults/github-repos.png";
import cheatSheetsImg from "../assets/category-defaults/cheat-sheets.png";
import templatesImg from "../assets/category-defaults/templates.png";
import newslettersImg from "../assets/category-defaults/newsletters.png";
import podcastsImg from "../assets/category-defaults/podcasts.png";
import apisImg from "../assets/category-defaults/apis.png";
import { getStoragePublicUrl } from "./storage";

const CATEGORY_DEFAULTS = {
  Articles: articlesImg,
  Books: booksImg,
  Courses: coursesImg,
  "YouTube Videos": youtubeVideosImg,
  "GitHub Repos": githubReposImg,
  "Cheat Sheets": cheatSheetsImg,
  Templates: templatesImg,
  Newsletters: newslettersImg,
  Podcasts: podcastsImg,
  APIs: apisImg,
};

export function getCategoryDefaultImage(category) {
  return CATEGORY_DEFAULTS[category] || articlesImg;
}

export function getThumbnailUrl(card) {
  if (!card) return articlesImg;

  if (card.thumbnail_source === "custom" && card.custom_thumbnail_path) {
    return getStoragePublicUrl(card.custom_thumbnail_path);
  }

  return getCategoryDefaultImage(card.category);
}

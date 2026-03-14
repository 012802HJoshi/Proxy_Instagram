const globalCategories = [
  { key: 'funny_animals', query: 'Funny Animal Videos', videoDuration: 'short', order: 'relevance' },
  { key: 'oddly_satisfying', query: 'Oddly Satisfying Videos', videoDuration: 'short', order: 'relevance' },
  { key: 'before_after', query: 'Before After Transformation', videoDuration: 'short', order: 'relevance' },
  { key: 'magic_tricks', query: 'Magic Tricks', videoDuration: 'short', order: 'relevance' },
  { key: 'diy_hacks', query: 'DIY Hacks', videoDuration: 'short', order: 'relevance' },
  { key: 'life_hacks', query: 'Life Hacks', videoDuration: 'short', order: 'relevance' },
  { key: 'science_experiments', query: 'Science Experiments', videoDuration: 'short', order: 'relevance' },
  { key: 'amazing_skills', query: 'Amazing Skills', videoDuration: 'short', order: 'relevance' },
  { key: 'street_food', query: 'Street Food', videoDuration: 'short', order: 'relevance' },
  { key: 'travel_vlogs', query: 'Travel Vlogs', videoDuration: 'short', order: 'relevance' }
];

const indiaCategories = [
  { key: 'cricket_shorts', query: 'Cricket Shorts', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'ipl_highlights', query: 'IPL Highlights', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'indian_street_food', query: 'Indian Street Food', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'indian_comedy', query: 'Indian Comedy', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'bollywood_shorts', query: 'Bollywood Shorts', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'tech_reviews_india', query: 'Tech Reviews India', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'mobile_tips', query: 'Mobile Tips and Tricks', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'motivation_hindi', query: 'Motivation Hindi', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'gaming_india', query: 'Gaming India', region: 'IN', videoDuration: 'short', order: 'relevance' },
  { key: 'finance_india', query: 'Personal Finance India', region: 'IN', videoDuration: 'short', order: 'relevance' }
];

const koreaCategories = [
  { key: 'kpop_shorts', query: 'Kpop Shorts', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'korean_drama_clips', query: 'Korean Drama Clips', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'korean_street_food', query: 'Korean Street Food', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'kbeauty_tips', query: 'K Beauty Tips', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'kpop_dance', query: 'Kpop Dance Cover', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'korean_vlogs', query: 'Daily Life Korea', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'korean_food', query: 'Korean Food Cooking', region: 'KR', videoDuration: 'short', order: 'relevance' },
  { key: 'korean_fashion', query: 'Korean Fashion Style', region: 'KR', videoDuration: 'short', order: 'relevance' }
];

const brazilCategories = [
  { key: 'football_brazil', query: 'Brazil Football Skills', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_funny', query: 'Brazil Funny Videos', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_street_food', query: 'Brazil Street Food', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_dance', query: 'Brazil Dance Shorts', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_lifestyle', query: 'Brazil Lifestyle Vlog', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_travel', query: 'Brazil Travel Shorts', region: 'BR', videoDuration: 'short', order: 'relevance' },
  { key: 'brazil_music', query: 'Brazil Music Shorts', region: 'BR', videoDuration: 'short', order: 'relevance' }
];


const categories = [
  ...globalCategories,
  ...indiaCategories,
  ...koreaCategories,
  ...brazilCategories
];

module.exports = categories;


# Media Tracking Application

A full-stack web application for tracking movies and TV shows you're watching, planning to watch, or have completed. Features progress tracking, statistics, ratings, and personalized recommendations.

## Features

- **User Authentication**: Secure signup and login system
- **Media Search**: Search for movies and TV shows using OMDB API
- **Track Progress**: Monitor your progress through movies and TV series (with episode tracking)
- **Three-List Organization**:
  - Currently Watching
  - Plan to Watch
  - Completed
- **Statistics Dashboard**: View your watching stats with visual charts
- **Ratings System**: Rate media on a 1-5 star scale
- **Recommendations**: Get personalized recommendations based on your completed media
- **Profile Management**: Update username, password, and avatar

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** (React Query) for data fetching and caching
- **shadcn/ui** components with Tailwind CSS
- **Recharts** for statistics visualization
- **Vite** for build tooling

### Backend
- **Express.js** server
- **PostgreSQL** database (Neon)
- **Drizzle ORM** for database management
- **Passport.js** for authentication
- **Express Session** for session management

## External APIs

### OMDB API (www.omdbapi.com)
The application uses the OMDB (Open Movie Database) API to fetch movie and TV show information.

**Endpoints Used:**
1. **Search**: `http://www.omdbapi.com/?apikey={YOUR_KEY}&s={query}`
   - Search for movies and TV shows by title
   
2. **Media Details**: `http://www.omdbapi.com/?apikey={YOUR_KEY}&i={imdb_id}&plot=full`
   - Get detailed information about a specific movie or show
   
3. **Season Information**: `http://www.omdbapi.com/?apikey={YOUR_KEY}&i={imdb_id}&Season={season_number}`
   - Get episode information for TV series seasons

## Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory (or use Replit Secrets):
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   OMDB_API_KEY=your_omdb_api_key_here
   ```

   **Getting an OMDB API Key:**
   - Visit [www.omdbapi.com/apikey.aspx](http://www.omdbapi.com/apikey.aspx)
   - Sign up for a free API key (1,000 daily requests)
   - Or upgrade to a paid plan for more requests

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Database Schema

The application uses the following main tables:

- **users**: User accounts with authentication
- **currently_watching**: Media items currently being watched
- **watchlist**: Media items planned to watch or completed
- **watch_sessions**: Track viewing history and watch time
- **ratings**: User ratings for media (1-5 stars)

## Internal API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user
- `PATCH /api/user` - Update user profile

### Currently Watching
- `GET /api/currently-watching` - Get all currently watching items
- `GET /api/currently-watching/:mediaId` - Get specific watching item
- `POST /api/currently-watching` - Add item to currently watching
- `PATCH /api/currently-watching/:id/progress` - Update progress
- `PATCH /api/currently-watching/:id/complete` - Mark as completed
- `PATCH /api/currently-watching/:id/move-to-watchlist` - Move to watchlist
- `DELETE /api/currently-watching/:id` - Remove from currently watching

### Watchlist
- `GET /api/watchlist` - Get watchlist items
- `GET /api/watchlist/:mediaId` - Get specific watchlist item
- `POST /api/watchlist` - Add to watchlist
- `PATCH /api/watchlist/:id` - Update watchlist item status
- `DELETE /api/watchlist/:id` - Remove from watchlist

### Media Search (OMDB Proxy)
- `GET /api/search?query={search_term}` - Search for movies/TV shows
- `GET /api/media/:id` - Get detailed media information
- `GET /api/media/:id?season={number}` - Get season info for TV series

### Statistics
- `GET /api/statistics` - Get user statistics
- `GET /api/statistics/watch-sessions` - Get recent watch sessions

### Ratings
- `POST /api/ratings` - Rate a media item
- `POST /api/ratings/batch` - Get multiple ratings
- `DELETE /api/ratings/:mediaId` - Delete a rating

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations

### Watch Sessions
- `POST /api/watch-sessions` - Create a watch session

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # Utility functions and query client
│   │   ├── pages/       # Page components
│   │   └── App.tsx      # Main app component with routing
├── server/              # Backend Express application
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database storage interface
│   └── auth.ts          # Authentication configuration
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle database schema
└── package.json         # Dependencies and scripts
```

## Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OMDB_API_KEY` | OMDB API key for movie/TV data | Yes |

## Security Notes

- **Never commit your `.env` file** - It's already in `.gitignore`
- **Never share your OMDB API key publicly**
- Passwords are hashed using bcrypt before storage
- Session management uses secure HTTP-only cookies

## Deployment

This application is ready to deploy on platforms like:
- Replit (easiest, with built-in database)
- Vercel
- Render
- Railway
- Heroku

Make sure to set the environment variables in your deployment platform's settings.

## Contributing

Feel free to open issues or submit pull requests for improvements!

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Movie/TV data provided by [OMDB API](http://www.omdbapi.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

import { Song } from "../models/song.model.js";

export const getAllSongs = async (req, res, next) => {
	try {
		// -1 = Descending => newest -> oldest
		// 1 = Ascending => oldest -> newest
		const songs = await Song.find().sort({ createdAt: -1 }).lean();
		res.set('Cache-Control', 'public, max-age=300');
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getFeaturedSongs = async (req, res, next) => {
	try {
		// fetch 6 random songs using mongodb's aggregation pipeline
		const totalSongs = await Song.countDocuments();
		console.log("Total songs in database:", totalSongs);
		const songs = await Song.aggregate([
			{
				$sample: { size: 6 },
			},
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);

		res.set('Cache-Control', 'public, max-age=600');
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getMadeForYouSongs = async (req, res, next) => {
	try {
		const songs = await Song.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);

		res.set('Cache-Control', 'public, max-age=600');
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getTrendingSongs = async (req, res, next) => {
	try {
		const songs = await Song.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);

		res.set('Cache-Control', 'public, max-age=600');
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const searchSongs = async (req, res, next) => {
	try {
		const { q } = req.query;
		if (!q || typeof q !== 'string') {
			return res.status(400).json({ message: "Valid query parameter 'q' is required" });
		}

		// Sanitize query to prevent NoSQL injection
		const sanitizedQuery = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const songs = await Song.find({
			$or: [
				{ title: { $regex: sanitizedQuery, $options: "i" } },
				{ artist: { $regex: sanitizedQuery, $options: "i" } }
			]
		}).limit(10).lean();

		res.json(songs);
	} catch (error) {
		next(error);
	}
};

import { Album } from "../models/album.model.js";

export const getAllAlbums = async (req, res, next) => {
	try {
		const albums = await Album.find();
		res.status(200).json(albums);
	} catch (error) {
		next(error);
	}
};

export const getAlbumById = async (req, res, next) => {
	try {
		const { albumId } = req.params;

		const album = await Album.findById(albumId).populate("songs");

		if (!album) {
			return res.status(404).json({ message: "Album not found" });
		}

		res.status(200).json(album);
	} catch (error) {
		next(error);
	}
};

export const searchAlbums = async (req, res, next) => {
	try {
		const { q } = req.query;
		if (!q || typeof q !== 'string') {
			return res.status(400).json({ message: "Valid query parameter 'q' is required" });
		}

		// Sanitize query to prevent NoSQL injection
		const sanitizedQuery = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const albums = await Album.find({
			$or: [
				{ title: { $regex: sanitizedQuery, $options: "i" } },
				{ artist: { $regex: sanitizedQuery, $options: "i" } }
			]
		}).limit(10).lean();

		res.status(200).json(albums);
	} catch (error) {
		next(error);
	}
};

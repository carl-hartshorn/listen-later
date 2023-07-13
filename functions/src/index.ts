import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { getAccessToken, search as spotifySearch, getEpisodes } from './spotify';
import { mapToSearchResults } from './mapToSearchResults';

const SPOTIFY_CLIENT_ID = defineString('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = defineString('SPOTIFY_CLIENT_SECRET');

const MINIMUM_SEARCH_QUERY_LENGTH = 3;

export const search = onCall({ enforceAppCheck: true, region: 'europe-west1' }, async (request) => {
	if (!request.auth) {
		throw new HttpsError('unauthenticated', 'Must be authenticated.');
	}

	const searchQuery = request.data.searchQuery;

	if (typeof searchQuery !== 'string' || searchQuery.length < MINIMUM_SEARCH_QUERY_LENGTH) {
		throw new HttpsError(
			'invalid-argument',
			`Must be called with a single string argument 'searchQuery' with ${MINIMUM_SEARCH_QUERY_LENGTH} or more characters.`
		);
	}

	const accessToken = await getAccessToken(
		SPOTIFY_CLIENT_ID.value(),
		SPOTIFY_CLIENT_SECRET.value()
	);

	const spotifySearchResponse = await spotifySearch(searchQuery, accessToken);
	const episodeIds = spotifySearchResponse.episodes.items.map((item) => item.id);
	const spotifyEpisodesResponse = await getEpisodes(episodeIds, accessToken);

	return mapToSearchResults(spotifySearchResponse, spotifyEpisodesResponse);
});

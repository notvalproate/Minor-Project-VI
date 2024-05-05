const genius = require("genius-lyrics");

const geniusToken = process.env.GENIUS_CLIENT_TOKEN;

const DEBUG_LYRICS = false;

class GeniusAPI {
    static geniusClient = new genius.Client(geniusToken);

    static async getLyrics(artists, title) {
        try {
            title = cleanTitleForSearch(title);

            const hasMultipleArtists = Array.isArray(artists);

            if(!hasMultipleArtists) {
                return await this.getBestLyrics([artists], title);
            }

            let result;

            for(let i = 0; i < artists.length; i++) {
                result = await this.getBestLyrics([artists[i]], title);

                if(result !== null) {
                    break;
                }
            }

            if(result === null) {
                return await this.getBestLyrics(artists, title);
            }

            return result;
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    static async getBestLyrics(artists, title) {
        const jointArtists = artists.join(' ');
        let searchQueryOne = `${title} ${jointArtists}`;
        let searchQueryTwo = `${jointArtists} ${title}`;

        const firstResult = await this.getBySearchQuery(searchQueryOne, artists, title);

        if(firstResult !== null) {
            return await firstResult.lyrics();
        }

        const secondResult = await this.getBySearchQuery(searchQueryTwo, artists, title);

        if(secondResult !== null) {
            return await secondResult.lyrics();
        }

        return null;
    }

    
    static async getBySearchQuery(searchQuery, artists, title) {
        debugLyrics(`\n\n\n################# SEARCHING FOR: ${searchQuery} #################`);

        const hits = await this.geniusClient.songs.search(searchQuery, {
            sanitizeQuery: false,
        });

        if(hits.length === 0) {
            debugLyrics("NO HITS");
            return null;
        }

        return this.getBestSearch(hits, artists, title);
    }

    static compareArtistNames(first, second) {
        const simpFirst = simplifyText(first);
        const simpSecond = simplifyText(second);

        const included = simpFirst.includes(simpSecond) || simpSecond.includes(simpFirst);

        if(included) {
            return true;
        }

        // Dirty checking, really desperate at this point to match artists, even skiley cant match.
        // EXPERIMENTAL, IF YOU DONT GET PROPER RESULTS FROM A SONG U THINK U SHUD GET, COMMENT THIS PART OUT AND TRY

        const cleanedFirst = simplifyArtist(first).split(' ');
        const cleanedSecond = simplifyArtist(second).split(' ');

        const atLeastOnePartExists = cleanedFirst.some(part => cleanedSecond.includes(part));

        if(atLeastOnePartExists) {
            return true;
        }

        const atLeastOneGeniusPartExists = cleanedSecond.some(part => cleanedFirst.includes(part));

        return atLeastOneGeniusPartExists;        
    }

    static getBestSearch(searches, reqArtists, reqTitle) {
        // FIRST PASS, EQUALS
        debugLyrics("########################################### FIRST PASS ###########################################");
        
        let i = 1;

        const simplifiedReqTitle = simplifyText(reqTitle);

        for(let item of searches) {
            item.hasArtists = false;
            
            debugLyrics(`\n${i++}>\n`);
            
            for(let reqArtist of reqArtists) {
                debugLyrics(`Required Artist:${reqArtist}||Current:${item.artist.name}|`);

                if(this.compareArtistNames(item.artist.name, reqArtist)) {
                    debugLyrics("ABOVE HAS ARTIST");
                    item.hasArtists = true;
                    break;
                }
            }

            debugLyrics("ABOVE DOESNT HAVE ARTIST");

            if(!item.hasArtists) {
                continue;
            }
            
            const simplifiedTitle = simplifyText(item.title);

            let titleMatches = ( simplifiedTitle == simplifiedReqTitle );

            debugLyrics(`Required Title:${simplifiedReqTitle}||Current:${simplifiedTitle}|`);

            if(titleMatches) {
                debugLyrics('ABOVE IS TITLE');
                return item;
            }
            debugLyrics('ABOVE IS NOT TITLE');
        }

        i = 1;

        // SECOND PASS, INCLUDES
        debugLyrics("########################################### SECOND PASS ###########################################");

        for(let item of searches) {
            if(!item.hasArtists) {
                continue;
            }

            let simplifiedTitle = simplifyText(item.title);

            let includesTitle = simplifiedTitle.includes(simplifiedReqTitle) || simplifiedReqTitle.includes(simplifiedTitle);

            debugLyrics(`\n\n${i++}>\nRequired Title: ${simplifiedReqTitle} || Current: ${simplifiedTitle}`);

            if(includesTitle) {
                debugLyrics('ABOVE HAS TITLE');
                return item;
            }
        }

        // THIRD PASS, CHECK FOR TITLE TO BE EXACTLY SAME
        debugLyrics("########################################### THIRD PASS ###########################################");

        for(let item of searches) {
            let includesTitle = simplifyText(item.title) === simplifiedReqTitle;

            debugLyrics(`Required Title: ${simplifiedReqTitle} || Current: ${simplifyText(item.title)}`);

            if(!includesTitle) {
                continue;
            }

            debugLyrics('ABOVE HAS SAME TITLE');
            return item;
        }

        // FOURTH PASS ALLOW GENIUS AS ARTIST
        debugLyrics("########################################### FOURTH PASS ###########################################");

        for(let item of searches) {
            let includesTitle = simplifyText(item.title).includes(simplifiedReqTitle) || simplifyText(simplifiedReqTitle).includes(item.title);

            if(!includesTitle) {
                continue;
            }

            let includesGenius = simplifyText(item.artist.name).includes('genius');
            debugLyrics(`Required Artist: ${'Genius'} || Current: ${item.artist.name}`);

            if(includesGenius) {
                debugLyrics('ABOVE HAS GENIUS');
                return item;
            }
        }

        debugLyrics("################# NO RESULT #################");

        return null;

    }
};

function cleanTitleForSearch(title) {
    title.replace(/[–—]/g, '-');

    const hyphenIndex = title.indexOf(' - ');

    if (hyphenIndex !== -1) {
        title = title.slice(0, hyphenIndex);
    }

    const featIndex = title.toLowerCase().indexOf('(feat');
    
    if (featIndex !== -1) {
        title = title.slice(0, featIndex);
    }

    const fromIndex = title.toLowerCase().indexOf('(from');
    
    if (fromIndex !== -1) {
        title = title.slice(0, fromIndex);
    }

    const parenthesisIndex = title.toLowerCase().indexOf('(');
    const endingIndex = title.toLowerCase().indexOf(')');

    if(parenthesisIndex > 0 && endingIndex === title.length - 1) {
        title = title.slice(0, parenthesisIndex);
    }

    return title;
}

function simplifyText(text) {
    return text
        .toLowerCase()
        .replaceAll(' ', '')
        .replaceAll('’', "'")
        .replace(/[–—]/g, '-')
        .replaceAll('˃', '>')
        .replaceAll('˂', '<')
        .replaceAll('…', '...')
        .normalize('NFC');
}

function simplifyArtist(artist) {
    return artist
        .toLowerCase()
        .replace(/[\[\]()–—\-'’˃>˂<…\.]/g, ' ')
        .replaceAll('.', '')
        .normalize('NFC');
}

function debugLyrics(text) {
    if(!DEBUG_LYRICS) return;

    console.log(text);
}

module.exports = { 
    GeniusAPI, 
};

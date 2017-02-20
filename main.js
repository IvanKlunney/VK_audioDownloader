// ==UserScript==
// @name        Simple audio-downloader 
// @namespace   https://vk.com
// @include     https://vk.com/audios*
// @version     0.3.6
// @grant       none
// ==/UserScript==

'use strict';

var ns = {
    _run: false,

    getAP: function (){
        return getAudioPlayer();
    },

    getCurrID: function (){
        return (this.trackID && this.playlistID)
            ?
                [this.playlistID, this.trackID].join('_')
            :
                new Error('Track or playlist is undefined.');
    },

    isNew: function (){
        return (!this.elem.getAttribute('data-save')) ? false : true;  
    },

    isError: function (obj){
        return (/Error/.test({}.toString.call(obj))) ? obj : false;
    },

    get running(){
        return this._run;
    },

    set running(v){
        this._run = v;
    }

};

ns.init = function (player){
    const   TRACK_IDX    = 0,
            PLAYLIST_IDX = 1; 

    this.contentType        = 'application/x-www-form-urlencoded',
    this.method             = 'POST',
    this.path               = '/al_audio.php',
    this.async              = true,
    this.cookie             = document.cookie;

    this.playlistID         = player._currentAudio[PLAYLIST_IDX],
    this.trackID            = player._currentAudio[TRACK_IDX],
    this.elem               = player._currentPlayingRows[0],
    this.currID             = this.getCurrID(),
    this.param              = ['act=reload_audio', 'al=1', 'ids=' + this.currID].join('&');

    return (!this.isNew() 
            && 
            !this.isError(this.currID))
                ?
                    this    
                :
                    this.error(this.isError(this.currID) || new Error('Attr data-save is defined.'));
};

ns.sendToVK = function (){
    return new Promise(function(res, rej){
        let xhr;
            if (window.XMLHttpRequest){
                xhr = new XMLHttpRequest;
            } else {
                this.error(new Error('XMLHttpRequest is undefined.'));
                return false;
            }

        xhr.open(this.method, this.path, this.async);
        xhr.setRequestHeader('Content-Type', this.contentType);
        xhr.setRequestHeader('Cookie', this.cookie);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onreadystatechange = function(){
            if(xhr.status === 200 && xhr.readyState === 4) {
                res(xhr.responseText);
            }  
        };

        xhr.onerror = function(){
            xhr.abort();
            rej(new Error('Connection closed.'));
        };

        xhr.send(this.param);

    }.bind(this));
};
    
ns.receiveFromVK = function (response){
    let begin = '<!><!json>',
        end   = '<!><!bool>',
        idx   = 1,
        link    ;

        if (response){
            link = response.substring(response.indexOf(begin) + begin.length, response.lastIndexOf(end)).split(',')[2];
                return link.substr(idx, link.indexOf('?') - idx);
        }
                
            return false;
};

ns.insertioNodes = function (link){
    this.insertNode     = document.createElement('a'),
    this.txtNode        = document.createTextNode('-SAVE- '),
    this.parNode        = this.elem.getElementsByClassName('audio_title_wrap')[0];
    
    this.insertNode.setAttribute('href', link);     
    this.insertNode.appendChild(this.txtNode);
    
    this.parNode.insertBefore( this.insertNode,
                               this.parNode.children[0] );
    
    this.elem.setAttribute('data-save', 'true');
    this.running = false;

        return this.insertNode;
};

ns.eventHandling = function (el){
    let self = this;
        el =   el.parentNode;

    if (!el.getAttribute('data-is-current') || el.getAttribute('data-is-current') === '0') return;
        if (el.getAttribute('data-audio')) this.running = true; 
            return function(run){
                return (run)   
                    ?
                        self.init(self.getAP())
                                        .sendToVK()
                                        .then(self.receiveFromVK, self.error)
                                        .then(self.insertioNodes.bind(self))
                    :
                        false;  
            } (this.running);
}

ns.error = function (err){
    console.log(err.message);
    return err;
};

document.getElementsByClassName('audio_playlist_wrap _audio_playlist')[0]
                                            .addEventListener(
                                                'click', 
                                                function(e) { 
                                                    setTimeout(function(){
                                                        if (e.target.className.indexOf('audio_play') !== -1){
                                                            return ns.eventHandling(e.target.parentNode).bind(ns); 
                                                        }
                                                    }, 300);
                                                },
                                                true
                                        );

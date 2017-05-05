#!/usr/bin/gjs

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Soup = imports.gi.Soup;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
function HttpGet(url, callback) { 
    let request = Soup.Message.new('GET', url);
    _httpSession.queue_message(request, Lang.bind(this,
        function(session, message) {
        callback(message.status_code, request.response_body.data);
        })
    );
}

function parseResponse(result) {
    result = JSON.parse(result);
    let content = '';
    if (result.errorCode == 0) {
        let query = result.query;
        if (result.basic) {
            if (result.basic['us-phonetic']) {
                content += '美['+ result.basic['us-phonetic'] + ']';
            }
            if (content.length > 0) {
                content += '  ';
            }
            if (result.basic['uk-phonetic']) {
                content += '英['+ result.basic['uk-phonetic'] + ']';
            }
            if (content.length > 0) {
                content += '\n';
            }
            if (result.basic.explains) {
                content += '\n';
                for (let index in result.basic.explains) {
                    content += result.basic.explains[index]+'\n';
                }
            }
        }
        if (result.web) {
            if (content.length > 0) {
                content += '\n';
            }
            for (let i in result.web) {
                obj = result.web[i];
                content += obj.key+': '+obj.value.join(';');
            }
        }
        if (content.length == 0 && result.translation && result.translation.length > 0) {
            content += result.translation[0];
        }

    }
    if (content.length == 0) {
        content = '没有找到释义';
    }
    return content;

}

const MessageDialogExample = new Lang.Class ({
    Name: 'MessageDialog Example',

    // Create the application itself
    _init: function () {
        this.application = new Gtk.Application ({
            application_id: 'org.example.jsmessagedialog',
            flags: Gio.ApplicationFlags.FLAGS_NONE });

        // Connect 'activate' and 'startup' signals to the callback functions
        this.application.connect('activate', Lang.bind(this, this._onActivate));
        this.application.connect('startup', Lang.bind(this, this._onStartup));

    },

    // Callback function for 'activate' signal presents windows when active
    _onActivate: function () {
        this._window.present ();
    },

    // Callback function for 'startup' signal initializes menus and builds the UI
    _onStartup: function () {
        this._initMenus();
        this._buildUI ();
    },



    // Build the application's UI
    _buildUI: function () {

        // Create the application window
        this._window = new Gtk.ApplicationWindow  ({
            application: this.application,
            window_position: Gtk.WindowPosition.CENTER,
            title: "有道翻译 for GJS",
            default_height: 600,
            default_width: 400 });
        
        // Create the text entry box
        this.searchEntry = new Gtk.Entry();
        
        // Bind it to a function that says what to do when the button is clicked
        this.searchEntry.connect ("key_release_event", Lang.bind(this, this._onSearch));
        
        // Create a textview for you to talk to the penguin
        this.textBuffer = new Gtk.TextBuffer();
        this.resultTextView = new Gtk.TextView ({
            buffer: this.textBuffer,
            editable: true,
            wrap_mode: Gtk.WrapMode.WORD });

        this.vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing:4});
                
        // Add the other widgets to the main box
        this.vbox.pack_start (this.searchEntry, false, false, 2);
        this.vbox.pack_start (this.resultTextView, true, true, 2);

        // Attach the main grid to the window
        this._window.add (this.vbox);
        
        // Show the window and all child widgets
        this._window.show_all();
    },

    _onSearch: function(entry, event) {
        if(event.get_event_type() === Gdk.EventType.KEY_RELEASE &&  
            event.get_keyval()[1] === Clutter.KEY_Return && entry.get_text().length > 0) {
            const word = entry.get_text();
            const url = 'http://fanyi.youdao.com/openapi.do?keyfrom=gjs-youdao&key=2035241872&type=data&doctype=json&version=1.1&q=' + word;
            HttpGet(url, function(status_code, body){
                if (status_code !== 200) {
                    return;
                } else {
                    const txt = word + '\n' + parseResponse(body);
                    this.textBuffer.set_text(txt, txt.length);
                }
            }.bind(this));
        }
    },
    
    // Build the application menu, including the button that calls the dialog
    _initMenus: function() {
        let menu = new Gio.Menu();
        menu.append("Message",'app.message');
        menu.append("Quit",'app.quit');
        this.application.set_app_menu(menu);

        // This pops up a MessageDialog when "Message" is clicked in the menu
        let messageAction = new Gio.SimpleAction ({ name: 'message' });
        messageAction.connect('activate', Lang.bind(this,
            function() {
                this._showMessageDialog();
            }));
        this.application.add_action(messageAction);

        // This closes the window when "Quit" is clicked in the menu
        let quitAction = new Gio.SimpleAction ({ name: 'quit' });
        quitAction.connect('activate', Lang.bind(this,
            function() {
                this._window.destroy();
            }));
        this.application.add_action(quitAction);
    },



    _showMessageDialog: function () {

        // Create a modal MessageDialog whose parent is the window
        this._messageDialog = new Gtk.MessageDialog ({
            transient_for: this._window,
            modal: true,
            buttons: Gtk.ButtonsType.OK_CANCEL,
            message_type: Gtk.MessageType.WARNING,
            text: "This action will cause the universe to stop existing." });

        this._messageDialog.connect ('response', Lang.bind(this, this._response_cb));
        this._messageDialog.show();
    },



    // Callback function (aka signal handler) for the response signal
    _response_cb: function (messagedialog, response_id) {

        // A simple switch that changes the main window's label
        switch (response_id) {
            case Gtk.ResponseType.OK:
                this.warningLabel.set_label ("*BOOM*\n");
                break;
            case Gtk.ResponseType.CANCEL:
                this.warningLabel.set_label ("Good choice!\n");
                break;
            case Gtk.ResponseType.DELETE_EVENT:
                this.warningLabel.set_label ("Dialog closed or cancelled.\n");
                break;
        }

        this._messageDialog.destroy();

    }

});

// Run the application
let app = new MessageDialogExample ();
app.application.run (ARGV);

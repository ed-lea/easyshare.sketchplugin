/*
 *
 *  This is a plugin for Sketch App http://bohemiancoding.com/sketch/
 *
 *  The plugin works by uploading your artboards and putting them on a
 *  private URL so that you can share them via email or chat.
 *
 *  It's the easiest and quickest way to share your Sketch work in progress
 *
 * * * * * * * * * * * * * * * * * * *
 *                                   *
 *  Read more at http://easier.cc/   *
 *                                   *
 * * * * * * * * * * * * * * * * * * *
 *
 *  Plugin by Ed Lea http://edlea.com
 *
 *
 *  Version 0.2 beta
 *
 */

var endpoint    = "http://easier.cc",
    tempDir     = NSTemporaryDirectory();


var onRun = function(context){
    var doc = context.document;
    var selection = context.selection;
    if ( selection.count() > 0 ){
        var pages = getSelectedPages(context);
    } else {
        var pages = getAllPages(context);
    }
}

function requestUri(){
    var task = NSTask.alloc().init()
    task.setLaunchPath("/usr/bin/curl");
    var args = NSArray.arrayWithObjects(
        "-v",
        "-X", "GET",
        "--header", "User-Agent: Sketch",
        endpoint + "/request/id", nil);
    task.setArguments(args);

    var outputPipe = [NSPipe pipe];
    [task setStandardOutput:outputPipe];

    task.launch();

    var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile];
    var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]];
    return JSON.parse(outputString);
}

function getSelectedPages(context){

    var doc             = context.document,
        artboards       = context.selection,
        artboardsCount  = artboards.count(),
        json            = requestUri(),
        update          = false;
    var uniqueId    = String( json.id ); 
    var version     = String( json.version ); // plugin version

    doc.showMessage("Uploading Selected Artboards... (Spinning beachball is normal)");

    /*
     * Check if this plugin version is up to date,
     * if not, send an update reminder.
     *
     */
    if( version > 0.2 ){
        // this means the plugin is out of date.
        // help the user update the plugin
        update = true;
    }

    if (artboardsCount >= 1){
        for (i = 0; i < artboardsCount; ++i) {
            doc.showMessage("Uploading artboard " + (i+1) + " of " + artboardsCount);
            var artboard = artboards[i];
            if ( isArtboard(artboard) ){
                var filename = safeName(artboard.name()) + ".png";
                var path = tempDir + filename;
                [doc saveArtboardOrSlice:artboard toFile:path];
                var result = post(path, filename, uniqueId);
            } else {
                doc.showMessage("You can't share floating layers, only artboards will be uploaded.");
            }
        }
        var url = endpoint + "/view/" + uniqueId;

        copyText(url);
        successWindow(context, url, update);

    }
}

function getAllPages(context){

    var doc = context.document;
    doc.showMessage("Uploading All Artboards... (Spinning beachball is normal)");
    /*
     * Set up initial variables
     */
    var pages       = doc.pages(),
        pageCount   = pages.count(),
        json        = requestUri(),
        update      = false;

    var uniqueId    = String( json.id );
    var version     = String( json.version ); // plugin version

    /*
     * Check if this plugin version is up to date,
     * if not, send an update reminder.
     *
     */
    if( version > 0.2 ){
        // this means the plugin is out of date.
        // help the user update the plugin
        update = true;
    }



    for (index = 0; index < pageCount; ++index) {
        var page = pages[index];

        /*
         * We have to set the current page of the document otherwise the png for the artboard will export empty
         */
        doc.setCurrentPage(page);
        var artboards = page.artboards();
        var artboardsCount = artboards.count();
        if (artboardsCount >= 1){
            for (i = 0; i < artboardsCount; ++i) {
                doc.showMessage("Uploading artboard " + (i+1) + " of " + artboardsCount + " (on page " + (index+1) + " of " + pageCount + ")");
                var artboard = artboards[i];
                var filename = safeName(artboard.name()) + ".png";
                var path = tempDir + filename;
                [doc saveArtboardOrSlice:artboard toFile:path];
                var result = post(path, filename, uniqueId);
                // log( "this artboard " + artboard.name() + " is on " + page.name() + " in " + path )
            }
        }
    }

    var url = endpoint + "/view/" + uniqueId;
    copyText(url);
    successWindow(context, url, update);
}


function post(path, filename, uniqueId){
    var task = NSTask.alloc().init()
    task.setLaunchPath("/usr/bin/curl");
    var args = NSArray.arrayWithObjects(
        "-v",
        "-X", "POST",
        "--header", "User-Agent: Sketch",
        "Content-Disposition: form-data; name=artboardfile; Content-Type=image/png;",
        "--form", "sketchartboard=@" + path,
        "--form", "filename=" + filename,
        "--form", "id=" + uniqueId,
        endpoint + "/upload/sketch", nil);
    task.setArguments(args);

    var outputPipe = [NSPipe pipe];
    [task setStandardOutput:outputPipe];

    task.launch();

    var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile];
    var outputString = [[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]]; // Autorelease optional, depending on usage.

    return JSON.parse(outputString);
}




function safeName(filename){
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function dialog(title,text){
    var app = [NSApplication sharedApplication];
    [app displayDialog:text withTitle:title]
}

function successWindow(context, viewURL, update){


    // create the enclosing window
    var win     = NSWindow.alloc().init();
    [win setFrame:NSMakeRect(0, 0, 300, 180) display:false]
    [win setBackgroundColor:[NSColor colorWithCalibratedRed:(230/255) green:(230/255) blue:(230/255) alpha:1]]


    // create the title
    var titleTxt = [[NSTextField alloc] initWithFrame:NSMakeRect(20, 40, 300, 100)]
    [titleTxt setEditable:false]
    [titleTxt setBordered:false]
    [titleTxt setTextColor:[NSColor colorWithCalibratedRed:(50/255) green:(50/255) blue:(50/255) alpha:1]]
    [titleTxt setDrawsBackground:false]
    [titleTxt setFont:[NSFont boldSystemFontOfSize:13]];
    [titleTxt setStringValue:"Sharing Artboards"]
    [[win contentView] addSubview:titleTxt]


    // create the body
    var bodyTxt = [[NSTextField alloc] initWithFrame:NSMakeRect(20, 60, 260, 50)]
    [bodyTxt setEditable:false]
    [bodyTxt setBordered:false]
    [bodyTxt setTextColor:[NSColor colorWithCalibratedRed:(80/255) green:(80/255) blue:(80/255) alpha:1]]
    [bodyTxt setDrawsBackground:false]
    [bodyTxt setFont:[NSFont userFontOfSize:13]];
    [bodyTxt setStringValue:"A link to your artboards has been copied to your clipboard."]
    [[win contentView] addSubview:bodyTxt]


    // create the buttons wrapper
    var buttonWrapper = [[NSView alloc] initWithFrame:NSMakeRect(0, 10, 300, 100)];
    buttonWrapper.setWantsLayer(true);
    [[win contentView] addSubview:buttonWrapper];



    // create the done button
    var doneButton = [[NSButton alloc] initWithFrame:NSMakeRect(16, 0, 92, 32)]
    [doneButton setTitle:"Done"]
    [doneButton setBezelStyle:NSRoundedBezelStyle]
    [doneButton setCOSJSTargetFunction:function(sender) {
        [win orderOut:nil]
        [NSApp stopModal]
    }];
    [doneButton setAction:"callAction:"]
    [buttonWrapper addSubview:doneButton]


    if ( update ){
        // create the update button
        var updateRect = NSMakeRect(16, 30, 274, 32);
        var updateButton = NSButton.alloc().initWithFrame(updateRect);
        updateButton.setTitle("Recommended: Update This Plugin");
        [updateButton setBezelStyle:NSRoundedBezelStyle]
        [updateButton setCOSJSTargetFunction:function(sender) {
            var updateUrl = [NSURL URLWithString:@"http://easier.cc/"];
            if( ![[NSWorkspace sharedWorkspace] openURL:updateUrl] ){
                sketchLog(@"Could not open url:" + [updateUrl description])
            }
        }];
        [updateButton setAction:"callAction:"]
        [buttonWrapper addSubview:updateButton]
    }


    // create the URL button
    var rect = NSMakeRect(110, 0, 180, 32);
    var linkButton = NSButton.alloc().initWithFrame(rect);
    linkButton.setTitle("Click to view link");
    [linkButton setBezelStyle:NSRoundedBezelStyle]
    [linkButton setCOSJSTargetFunction:function(sender) {
        var url = NSURL.URLWithString(String( viewURL ));
        if( ![[NSWorkspace sharedWorkspace] openURL:url] ){
            sketchLog(@"Could not open url:" + [url description])
        }
    }];
    [linkButton setAction:"callAction:"]
    [buttonWrapper addSubview:linkButton]





    [NSApp runModalForWindow:win]
}

function isArtboard(arboard) {
    return [arboard isMemberOfClass:[MSArtboardGroup class]]
}

function copyText(txt){
    var pasteBoard = [NSPasteboard generalPasteboard]
        [pasteBoard declareTypes:[NSArray arrayWithObject:NSPasteboardTypeString] owner:nil]
    [pasteBoard setString:txt forType:NSPasteboardTypeString]
}
## bugs
- [x] text from the orientation lines is not deleting
- [x] fix the cursor interaction to work globally and treat exiting box as mouse up
- [ ] when changing layers, change the mode to drawd
- [ ] select does not work on perfectly vertical and horizontal lines
- [ ] history stack exists but does not work too well
- [ ] delete malformed orientation line input on change
- [ ] (if user clicks away after drawing one point in the orientation line, it creates a stray text element. Delete by default)
- [ ] gate the save drawing feature to ensure that the orientation lines are properly formed
- [ ] some kind of graphical error indication that they are malformed
- [ ] 
## todo
- [x] get the selection hooked to the double click
- [x] make exceptions for the orientation lines
- [x] implement select delete
- [x] get a length working for the orientation line
- [ ] naming files
- [x] load from thumbnails
- [x] make layers with thumbnails
- [x] convert draw select to sidebar icons
- [x] add select to points level
- [ ] brainstorm connections interface
- [x] have move points on when drawing on outline and orientation lines
- [ ] autosave to session storage
- [ ] some graphical indicator of orientation lines direction clicking
    - [ ] 
- [ ] make it impossible to draw orientation lines in the border 
- [ ] add labels to orient lines (gated)
- [ ] make the assembler take null
- [ ] orientation lines only work in one direction, make sure that is clear 
- [ ] move clear layer to be outside the selection area for the layer => make an edit layer button inside the layer 
- [ ] make text subordinate to a point on a Line Object to ensure that delete takes care of both and that we don't need to handle these individually
- [ ] create an instructional tutoria,
## todo big
- [x] make a global file system
- [ ] enable a history stack
- [x] make the point system consistent across the assembler and the drawing 
- [x] refactor in general
- [ ] line smoothing function to reduce lag time + allow control point moving => change the point type to include control points
- [ ] think about how to seperate out the render from the representation while maintaining real time updates (store element in some dictionary where the caller maintains the element they are referring to and want a string render to) (maintain a "master copy" of each attribute and only return the string of the HTML attribute allowing it to be appended on muliple elements (bad for maintaining things like ID))

GOT IT: each line, text, circle element maintains an element list that it will automatically update on change (EI, append, update, etc will automatically trigger a redraw on all elements it needs to maintain)

the SVG class will maintain the overarching SVGs that reference particular lines and keeps track of the element it needs to update and the 
element list it needs to append which is independent of the representation. 
if you need to delete a particular svg, delete overall svg. to delete line, delete line representation and then 
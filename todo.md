## bugs
- [x] text from the orientation lines is not deleting
- [x] fix the cursor interaction to work globally and treat exiting box as mouse up
- [ ] when changing layers, change the mode to drawd
- [x] select does not work on perfectly vertical and horizontal lines. Also does not work on lines with dimension zero (points)
- [ ] history stack exists but does not work too well
- [ ] delete malformed orientation line input on change
- [x] gate the save drawing feature to ensure that the orientation lines are properly formed
- [x] some kind of graphical error indication that they are malformed
- [ ] add error checking on generation
- [ ] no graphical indication when the assembler is loading
- [x] make select better. ATM it 
- [ ] make a working history stack. Make it a member of the svg class
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
- [x] brainstorm connections interface
- [x] have move points on when drawing on outline and orientation lines
- [ ] autosave to session storage
- [x] make it impossible to draw orientation lines in the border 
- [x] mark if outline is invalid 
- [ ] add labels to orient lines (gated)
- [x] create an instructional tutorial
- [ ] demo tile set
- [x] error modal
## todo big
- [x] make a global file system
- [ ] enable a history stack
- [x] make the point system consistent across the assembler and the drawing 
- [x] refactor in general
- [ ] refactor again
- [ ] line smoothing function to reduce lag time + allow control point moving => change the point type to include control points
- [x] think about how to seperate out the render from the representation while maintaining real time updates (store element in some dictionary where the caller maintains the element they are referring to and want a string render to) (maintain a "master copy" of each attribute and only return the string of the HTML attribute allowing it to be appended on muliple elements (bad for maintaining things like ID))

GOT IT: each line, text, circle element maintains an element list that it will automatically update on change (EI, append, update, etc will automatically trigger a redraw on all elements it needs to maintain)

the SVG class will maintain the overarching SVGs that reference particular lines and keeps track of the element it needs to update and the 
element list it needs to append which is independent of the representation. 
if you need to delete a particular svg, delete overall svg. to delete line, delete line representation and then 
$('#table').editableTableWidget();
$('#textAreaEditor').editableTableWidget({editor: $('<textarea>')});

add = function(cell) {
//	var data = getData(cell);
	var row = cell.closest("tr");
	var	url = row.find("td:nth-child(2)").text();
	$.ajax({
			type: 'POST',
			url: '/admin/add',
			data: {'url': url },
			success: function(){ console.log("data sent"); }
	});
};

update = function(cell) {
//	var cell = $(this);
	var data = getData(cell);
  $.ajax({
      type: 'POST',
      url: '/admin/edit',
      data: data ,
      contentType: 'application/json',
      success: function(){ console.log("data sent"); }
  });
};

getData = function(cell) {
	var row = cell.closest("tr");
	var	url = row.find("td:nth-child(2)").text();
  var data = new Array();

  $('#table tr').each(function(row,tr){
    data[row] = {
      "url" : $(tr).find('td:eq(1)').text(),
      "title" : $(tr).find('td:eq(0)').text()
		}
  });
  data.shift();
  return JSON.stringify(data);
};

$('button').on('click', function(evt){
	$('#newtitle').html( $('#title').val() );
	$('#newurl').html( $('#url').val() );
	add($(this));
});

$('table td').on('change', function (evt, newValue) {
	update($(this));

/*	var cell = $(this);
  var row = cell.closest("tr");
	var	url = row.find("td:nth-child(2)").text();
  var data = new Array();

  $('#table tr').each(function(row,tr){
    data[row] = {
      "url" : $(tr).find('td:eq(1)').text(),
      "title" : $(tr).find('td:eq(0)').text()
		}
    });
  data.shift();
  data = JSON.stringify(data);

  $.ajax({
      type: 'POST',
      url: '/admin/edit',
      data: data ,
      contentType: 'application/json',
      success: function(){ console.log("data sent"); }
  });
  $.ajax({
      type: 'POST',
      url: '/admin/add',
      data: {'url': url },
      success: function(){ console.log("data sent"); }
  });

  console.log("URL:"+url+"Data:" + data);
*/
});

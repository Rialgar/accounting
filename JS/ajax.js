function getXMLHttpRequest(){
	var xhr;
	try
	{
		xhr = new XMLHttpRequest();
	}
	catch (e)
	{
		try
		{
			xhr = new ActiveXObject('Msxml2.XMLHTTP');
		}
		catch (e2)
		{
			try
			{
				xhr = new ActiveXObject('Microsoft.XMLHTTP');
			}
			catch (e3)
			{
				xhr = false;
			}
		}
	}
	return xhr;
}
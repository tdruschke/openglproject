<?php
function categories()
{
		$params = [
			'apiKey' => 'prMgvsxVMVXigmWxp2a4zHXhLzBDHr6B',
			'companyDirectoryID' => 2,
			// 'filters' => "publication:1"
		];
		
		$url = 'https://sales.colepublishing.com/api/v2/company-directories/company-categories';
		$post_vars = http_build_query($params);
		
		$ch = curl_init();
		curl_setopt_array(
			$ch,
			[
				CURLOPT_URL            => $url,
				CURLOPT_POST           => 1,
				CURLOPT_POSTFIELDS     => $post_vars,
				CURLOPT_RETURNTRANSFER => TRUE,
				CURLOPT_CONNECTTIMEOUT => 3,
				CURLOPT_TIMEOUT        => 20
			]
		);
		
		$result = curl_exec($ch);
		// $entries = json_decode($result);
		
        // echo '<pre>';
        echo $result;
		// print_r($entries);
		
		curl_close ($ch);
}

categories();
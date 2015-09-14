<?php
print_r($_FILES);
$csv = array_map('str_getcsv', file('data.csv'));

?>
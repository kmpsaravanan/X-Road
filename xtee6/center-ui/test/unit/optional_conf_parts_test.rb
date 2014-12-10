require 'test_helper'

class OptionalConfPartsTest < ActiveSupport::TestCase

  def setup
    @result_file = "build/optional_content"

    FileUtils.rm_f(@result_file)
  end

  # Script test/resources/validate_conf_part_SUCCESS.sh goes together
  # with this test.
  test "Should validate optional conf parts successfully" do
    # Given
    validation_program = "test/resources/validate_conf_part_SUCCESS.sh"
    file_bytes = "SUCCESSFULLY VALIDATED"
    content_identifier = "IDENTIFIERMAPPING"

    validator = OptionalConfParts::Validator.new(
        validation_program, file_bytes, content_identifier)

    # When
    actual_stderr = validator.validate()

    # Then
    expected_stderr = ["firstWarningLine", "secondWarningLine"]
    assert_equal(expected_stderr, actual_stderr)

    actual_validated_bytes = get_validated_bytes()
    assert_equal(file_bytes, actual_validated_bytes)
  end

  # Script test/resources/validate_conf_part_FAILURE.sh goes together
  # with this test.
  test "Should raise Exception when script exit status not zero" do
    # Given
    validation_program = "test/resources/validate_conf_part_FAILURE.sh"
    file_bytes = "VALIDATION FAILED"
    content_identifier = "CLASSIFIERS"

    validator = OptionalConfParts::Validator.new(
        validation_program, file_bytes, content_identifier)

    # When/then
    e = assert_raise(OptionalConfParts::ValidationException) do
      validator.validate()
    end

    expected_stderr = ["firstErrorLine"]

    assert_equal(expected_stderr, e.stderr)
  end

  test "Should raise Exception when validation script does not exist" do
    # Given
    validation_program = "test/resources/validate_conf_part_NONEXISTENT.sh"
    file_bytes = "VALIDATION FAILED"
    content_identifier = "CLASSIFIERS"

    validator = OptionalConfParts::Validator.new(
        validation_program, file_bytes, content_identifier)

    # When/then
    e = assert_raise(OptionalConfParts::ValidationException) do
      validator.validate()
    end

    assert_equal([], e.stderr)
  end

  def get_validated_bytes()
    raw_content = IO.read(@result_file)

    return raw_content.strip!
  end
end